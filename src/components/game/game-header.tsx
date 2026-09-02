"use client";

import { RotateCcw, Settings2, Undo2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { scoreToLabel } from "@/lib/chess/engine";
import type { EngineChoice, GameOverReason, GameSettings, PlayerColor } from "@/lib/chess/types";

export function GameHeader({
  settings, turn, inCheck, gameOver, winner, playerColor, evalScore, busyLabel, onUndo, onNewGame, onSettings,
}: {
  settings: GameSettings;
  turn: PlayerColor;
  inCheck: boolean;
  gameOver?: GameOverReason;
  winner?: PlayerColor;
  playerColor: PlayerColor;
  evalScore?: EngineChoice | null;
  busyLabel?: string | null;
  onUndo: () => void;
  onNewGame: () => void;
  onSettings: () => void;
}) {
  const youToMove = !gameOver && turn === playerColor;
  const status = gameOver
    ? gameOver === "checkmate" ? (winner === playerColor ? "You win" : "Checkmate") : "Draw"
    : busyLabel
      ? busyLabel
      : inCheck
        ? youToMove ? "You are in check" : "Check"
        : youToMove ? "Your move" : "Their move";

  return (
    <header className="flex items-center justify-between gap-3 px-4 pt-[max(0.75rem,env(safe-area-inset-top))] pb-2">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-[11px] font-medium tracking-[0.22em] text-amber-200/70 uppercase">Boardside</p>
          <Badge variant="secondary" className="h-5 px-1.5 text-[10px]">
            {settings.opponent === "engine" ? `Bot · ${settings.strength}` : "Coach"}
          </Badge>
        </div>
        <div className="mt-0.5 flex items-center gap-2">
          <p className="truncate text-sm font-medium">{status}</p>
          {evalScore && !gameOver ? (
            <span className="font-mono text-[11px] text-muted-foreground">
              {scoreToLabel(playerColor === "w" ? evalScore.score : -evalScore.score)}
            </span>
          ) : null}
        </div>
      </div>
      <div className="flex items-center gap-1">
        <Button variant="ghost" size="icon" onClick={onUndo} aria-label="Undo move"><Undo2 /></Button>
        <Button variant="ghost" size="icon" onClick={onNewGame} aria-label="New game"><RotateCcw /></Button>
        <Button variant="ghost" size="icon" onClick={onSettings} aria-label="Game settings"><Settings2 /></Button>
      </div>
    </header>
  );
}
