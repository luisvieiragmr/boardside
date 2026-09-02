"use client";

import { useChat } from "@ai-sdk/react";
import { Chess } from "chess.js";
import { DefaultChatTransport } from "ai";
import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ChessCoachUIMessage } from "@/lib/agents/chess-coach";
import { CoachDock } from "@/components/coach/coach-dock";
import { GameHeader } from "@/components/game/game-header";
import { PromotionDialog } from "@/components/game/promotion-dialog";
import { SetupScreen } from "@/components/game/setup-screen";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useMediaQuery } from "@/hooks/use-media-query";
import { annotationFromMessages, pendingOpponentMoves } from "@/lib/chat/message-utils";
import {
  applyMove, buildGameContext, capturedPieces, describePosition, legalTargets, needsPromotion, pgnFromMoves,
} from "@/lib/chess/analysis";
import { chooseEngineMove } from "@/lib/chess/engine";
import { DEFAULT_SETTINGS } from "@/lib/chess/types";
import type { BoardAnnotation, EngineChoice, GameContext, GameSettings, PlayedMove } from "@/lib/chess/types";

const ChessBoardView = dynamic(
  () => import("@/components/game/chess-board").then((mod) => mod.ChessBoardView),
  { ssr: false, loading: () => <div className="mx-auto aspect-square w-full max-w-[min(100%,72vh)] rounded-[14px] bg-[#c8a27a]" /> },
);

const START_FEN = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";
const UNICODE: Record<string, string> = {
  P: "♙", N: "♘", B: "♗", R: "♖", Q: "♕", K: "♔",
  p: "♟", n: "♞", b: "♝", r: "♜", q: "♛", k: "♚",
};

export function GameApp() {
  const desktop = useMediaQuery("(min-width: 1024px)");
  const [started, setStarted] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [input, setInput] = useState("");
  const [settings, setSettings] = useState<GameSettings>(DEFAULT_SETTINGS);
  const [fen, setFen] = useState(START_FEN);
  const [playedMoves, setPlayedMoves] = useState<PlayedMove[]>([]);
  const playedMovesRef = useRef<PlayedMove[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [pending, setPending] = useState<{ from: string; to: string } | null>(null);
  const [engineThinking, setEngineThinking] = useState(false);
  const [hintAnnotation, setHintAnnotation] = useState<BoardAnnotation | null>(null);
  const [evalScore, setEvalScore] = useState<EngineChoice | null>(null);
  const appliedMoves = useRef(new Set<string>());
  const settingsRef = useRef(settings);
  const fenRef = useRef(fen);

  useEffect(() => { playedMovesRef.current = playedMoves; }, [playedMoves]);
  useEffect(() => { settingsRef.current = settings; }, [settings]);
  useEffect(() => { fenRef.current = fen; }, [fen]);

  const { messages, sendMessage, setMessages, status } = useChat<ChessCoachUIMessage>({
    transport: new DefaultChatTransport({ api: "/api/coach" }),
    onFinish({ message }) {
      if (settingsRef.current.opponent !== "coach") return;
      for (const move of pendingOpponentMoves([message])) {
        if (appliedMoves.current.has(move.id)) continue;
        appliedMoves.current.add(move.id);
        const played = applyMove(fenRef.current, move.from, move.to, move.promotion);
        if (!played) continue;
        if (new Chess(fenRef.current).turn() === settingsRef.current.playerColor) continue;
        setFen(played.fen);
        setPlayedMoves((history) => [...history, played.move]);
      }
    },
  });

  const lastMove = playedMoves.at(-1);
  const pgn = useMemo(() => pgnFromMoves(playedMoves), [playedMoves]);
  const brief = useMemo(
    () => describePosition(fen, { strength: settings.strength, withEngineHint: false, lastMove, pgn }),
    [fen, lastMove, pgn, settings.strength],
  );
  const captured = useMemo(() => capturedPieces(fen), [fen]);
  const targets = useMemo(() => (selected ? legalTargets(fen, selected) : []), [fen, selected]);
  const coachBusy = status === "submitted" || status === "streaming";
  const annotation = hintAnnotation ?? annotationFromMessages(messages);
  const playerTurn = brief.turn === settings.playerColor && !brief.gameOver;
  const interactive = started && playerTurn && !engineThinking && !pending && !coachBusy;

  const askCoach = useCallback((
    text: string,
    trigger: GameContext["trigger"],
    nextFen = fen,
    nextSettings = settings,
    history = playedMoves,
  ) => {
    const game = buildGameContext(nextFen, {
      playerColor: nextSettings.playerColor,
      opponent: nextSettings.opponent,
      strength: nextSettings.strength,
    }, trigger, { lastMove: history.at(-1), pgn: pgnFromMoves(history) });
    setHintAnnotation(null);
    void sendMessage({ text }, { body: { game } });
  }, [fen, playedMoves, sendMessage, settings]);

  const playEngine = useCallback((fromFen: string, nextSettings = settings) => {
    setEngineThinking(true);
    window.setTimeout(() => {
      const move = chooseEngineMove(fromFen, nextSettings.strength);
      if (!move) { setEngineThinking(false); return; }
      const played = applyMove(fromFen, move.from, move.to, move.promotion);
      setEngineThinking(false);
      if (!played) return;
      const history = [...playedMovesRef.current, played.move];
      setFen(played.fen);
      setPlayedMoves(history);
      setEvalScore(move);
      if (nextSettings.autoCoach) {
        askCoach(
          `I played and the bot answered ${played.move.san}. Teach this moment.`,
          "after-opponent-move",
          played.fen,
          nextSettings,
          history,
        );
      }
    }, 120);
  }, [askCoach, settings]);

  const commitMove = useCallback((from: string, to: string, promotion?: string) => {
    const played = applyMove(fen, from, to, promotion);
    if (!played) return false;
    const history = [...playedMovesRef.current, played.move];
    setFen(played.fen);
    setPlayedMoves(history);
    setSelected(null);
    setPending(null);
    setHintAnnotation(null);
    const after = new Chess(played.fen);
    if (after.isGameOver()) {
      if (settings.autoCoach) askCoach(`The game ended after ${played.move.san}.`, "after-player-move", played.fen, settings, history);
      return true;
    }
    if (settings.opponent === "engine") playEngine(played.fen);
    else if (settings.autoCoach) askCoach(`I just played ${played.move.san}. Explain it, then play your reply if it is your turn.`, "after-player-move", played.fen, settings, history);
    else askCoach(`Play your reply to ${played.move.san}.`, "coach-to-move", played.fen, settings, history);
    return true;
  }, [askCoach, fen, playEngine, settings]);

  const tryMove = useCallback((from: string, to: string) => {
    if (!interactive) return false;
    if (needsPromotion(fen, from, to)) { setPending({ from, to }); return true; }
    return commitMove(from, to);
  }, [commitMove, fen, interactive]);

  const onSquareClick = useCallback((square: string) => {
    if (!interactive) { setSelected(null); return; }
    if (selected && targets.includes(square)) { tryMove(selected, square); return; }
    const piece = new Chess(fen).get(square as never);
    if (piece && piece.color === settings.playerColor) { setSelected(square); return; }
    setSelected(null);
  }, [fen, interactive, selected, settings.playerColor, targets, tryMove]);

  const canMoveFrom = useCallback((square: string) => {
    const piece = new Chess(fen).get(square as never);
    return Boolean(piece && piece.color === settings.playerColor && interactive);
  }, [fen, interactive, settings.playerColor]);

  const startGame = (next = settings) => {
    appliedMoves.current.clear();
    setFen(START_FEN);
    setPlayedMoves([]);
    setSelected(null);
    setPending(null);
    setHintAnnotation(null);
    setEvalScore(null);
    setMessages([]);
    setStarted(true);
    setSettingsOpen(false);
    setChatOpen(false);
    setSettings(next);
    window.setTimeout(() => {
      if (next.playerColor === "b" && next.opponent === "coach") {
        askCoach("I am black. Play the first white move and explain it.", "coach-to-move", START_FEN, next, []);
      } else if (next.autoCoach) {
        askCoach("New game. Give me a short opening plan and mark a healthy first idea.", "new-game", START_FEN, next, []);
      }
      if (next.playerColor === "b" && next.opponent === "engine") playEngine(START_FEN, next);
    }, 40);
  };

  const undo = () => {
    let history = [...playedMoves];
    if (history.length === 0) return;
    if (history.at(-1)?.color !== settings.playerColor) history = history.slice(0, -1);
    if (history.at(-1)?.color === settings.playerColor) history = history.slice(0, -1);
    const chess = new Chess();
    for (const move of history) chess.move({ from: move.from, to: move.to, promotion: move.promotion ?? "q" });
    setPlayedMoves(history);
    setFen(chess.fen());
    setSelected(null);
    setHintAnnotation(null);
  };

  if (!started) {
    return <SetupScreen settings={settings} onChange={setSettings} onStart={() => startGame(settings)} />;
  }

  const busyLabel = engineThinking ? "Bot is thinking" : coachBusy ? (settings.opponent === "coach" && !playerTurn ? "Coach is moving" : "Coach is looking") : null;

  return (
    <div className="flex h-dvh flex-col bg-background">
      <GameHeader
        settings={settings} turn={brief.turn} inCheck={brief.inCheck} gameOver={brief.gameOver}
        winner={brief.winner} playerColor={settings.playerColor} evalScore={evalScore} busyLabel={busyLabel}
        onUndo={undo} onNewGame={() => startGame(settings)} onSettings={() => setSettingsOpen(true)}
      />
      <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
        <div className="flex min-h-0 flex-col px-3 lg:w-[min(560px,46vw)] lg:shrink-0">
          <div className="relative mx-auto w-full max-w-[min(100%,72vh)]">
            <ChessBoardView
              fen={fen} orientation={settings.playerColor} lastMove={lastMove} selected={selected}
              legalTargets={targets} annotation={annotation} interactive={interactive}
              canMoveFrom={canMoveFrom} onDrop={tryMove} onSquareClick={onSquareClick}
            />
            {pending ? <PromotionDialog color={settings.playerColor} onPick={(piece) => commitMove(pending.from, pending.to, piece)} /> : null}
          </div>
          <div className="mt-3 mb-2 flex items-center justify-between gap-3 px-1">
            <p className="min-h-5 font-mono text-xs tracking-wide text-muted-foreground">
              {captured.b.map((piece) => UNICODE[piece] ?? piece).join(" ")}
              <span className="mx-2 text-foreground/70">{lastMove ? lastMove.san : "—"}</span>
              {captured.w.map((piece) => UNICODE[piece] ?? piece).join(" ")}
            </p>
            <Button size="sm" variant="secondary" onClick={() => {
              const move = chooseEngineMove(fen, settings.strength);
              if (!move) return;
              setEvalScore(move);
              setHintAnnotation({
                title: `Hint · ${move.san}`,
                arrows: [{ from: move.from, to: move.to, color: "green" }],
                squares: [{ square: move.from, color: "green" }, { square: move.to, color: "green" }],
              });
              if (settings.autoCoach) askCoach(`Give me a hint. The engine likes ${move.san}.`, "hint");
            }} disabled={!playerTurn}>Hint</Button>
          </div>
        </div>
        <div className="min-h-0 flex-1">
          <CoachDock
            messages={messages} expanded={desktop || chatOpen} forceExpanded={desktop}
            onToggle={() => setChatOpen((open) => !open)} input={input} onInput={setInput}
            onSend={(text) => { setInput(""); if (!desktop) setChatOpen(true); askCoach(text, "user-question"); }}
            busy={coachBusy}
          />
        </div>
      </div>
      <Sheet open={settingsOpen} onOpenChange={setSettingsOpen}>
        <SheetContent side="bottom" className="max-h-[90dvh] overflow-y-auto">
          <SheetHeader><SheetTitle>Game setup</SheetTitle></SheetHeader>
          <SetupScreen settings={settings} onChange={setSettings} onStart={() => startGame(settings)} embedded />
        </SheetContent>
      </Sheet>
    </div>
  );
}
