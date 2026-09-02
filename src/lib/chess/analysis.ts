import { Chess, type Color, type Move, type Square } from "chess.js";
import { chooseEngineMove } from "./engine";
import type {
  EngineStrength,
  GameContext,
  GameOverReason,
  PlayedMove,
  PositionBrief,
  TacticalNote,
} from "./types";

const PIECE_NAME: Record<string, string> = {
  p: "pawn", n: "knight", b: "bishop", r: "rook", q: "queen", k: "king",
};

export function gameOverReason(chess: Chess): GameOverReason | undefined {
  if (chess.isCheckmate()) return "checkmate";
  if (chess.isStalemate()) return "stalemate";
  if (chess.isThreefoldRepetition()) return "threefold";
  if (chess.isInsufficientMaterial()) return "insufficient";
  if (chess.isDraw()) return "draw";
  return undefined;
}

export function toPlayedMove(move: Move): PlayedMove {
  return {
    from: move.from,
    to: move.to,
    san: move.san,
    color: move.color,
    captured: move.captured,
    promotion: move.promotion,
  };
}

function collectTactics(chess: Chess, lastMove?: PlayedMove): TacticalNote[] {
  const notes: TacticalNote[] = [];
  if (!lastMove) return notes;
  if (chess.isCheckmate()) {
    notes.push({ kind: "mate-threat", text: `${lastMove.san} is checkmate.`, squares: [lastMove.to] });
    return notes;
  }
  if (chess.inCheck()) {
    notes.push({ kind: "check", text: `${lastMove.san} gives check.`, squares: [lastMove.to] });
  }
  if (lastMove.captured) {
    notes.push({
      kind: "capture",
      text: `${lastMove.san} takes a ${PIECE_NAME[lastMove.captured] ?? "piece"}.`,
      squares: [lastMove.to],
    });
  }
  const replies = chess.moves({ verbose: true });
  const recaptures = replies.filter((move) => move.to === lastMove.to && move.isCapture());
  const movedPiece = chess.get(lastMove.to as Square);
  if (recaptures.length > 0 && movedPiece && movedPiece.type !== "p") {
    notes.push({
      kind: "hanging",
      text: `The piece on ${lastMove.to} can be taken by ${recaptures[0]!.san}.`,
      squares: [lastMove.to, recaptures[0]!.from],
    });
  }
  return notes;
}

export function describePosition(
  fen: string,
  options?: {
    strength?: EngineStrength;
    withEngineHint?: boolean;
    lastMove?: PlayedMove;
    pgn?: string;
  },
): PositionBrief {
  const chess = new Chess(fen);
  const history = chess.history({ verbose: true });
  const lastMove = options?.lastMove ?? (history.at(-1) ? toPlayedMove(history.at(-1)!) : undefined);
  const over = gameOverReason(chess);
  const engineHint =
    options?.withEngineHint !== false && !over
      ? (chooseEngineMove(fen, options?.strength ?? "medium") ?? undefined)
      : undefined;
  return {
    fen,
    pgn: options?.pgn || chess.pgn() || "(starting position)",
    turn: chess.turn(),
    moveNumber: chess.moveNumber(),
    inCheck: chess.inCheck(),
    legalSans: chess.moves(),
    lastMove,
    engineHint,
    tactics: collectTactics(chess, lastMove),
    gameOver: over,
    winner: over === "checkmate" ? (chess.turn() === "w" ? "b" : "w") : undefined,
  };
}

export function applyMove(fen: string, from: string, to: string, promotion?: string) {
  const chess = new Chess(fen);
  try {
    const move = chess.move({ from, to, promotion: promotion ?? "q" });
    return { fen: chess.fen(), move: toPlayedMove(move) };
  } catch {
    return null;
  }
}

export function legalTargets(fen: string, from: string): string[] {
  const chess = new Chess(fen);
  return chess.moves({ square: from as Square, verbose: true }).map((move) => move.to);
}

export function needsPromotion(fen: string, from: string, to: string): boolean {
  const chess = new Chess(fen);
  const piece = chess.get(from as Square);
  if (!piece || piece.type !== "p") return false;
  return to.endsWith("8") || to.endsWith("1");
}

export function capturedPieces(fen: string): { w: string[]; b: string[] } {
  const start = "rnbqkbnrppppppppPPPPPPPPRNBQKBNR";
  const chess = new Chess(fen);
  const remaining = chess
    .board()
    .flat()
    .filter(Boolean)
    .map((piece) => (piece!.color === "w" ? piece!.type.toUpperCase() : piece!.type))
    .join("");
  const pool = [...start];
  for (const piece of remaining) {
    const index = pool.indexOf(piece);
    if (index >= 0) pool.splice(index, 1);
  }
  return {
    w: pool.filter((piece) => piece === piece.toUpperCase()),
    b: pool.filter((piece) => piece === piece.toLowerCase()),
  };
}

export function pgnFromMoves(moves: PlayedMove[]): string {
  const chess = new Chess();
  for (const move of moves) {
    chess.move({ from: move.from, to: move.to, promotion: move.promotion ?? "q" });
  }
  return chess.pgn() || "(starting position)";
}

export function buildGameContext(
  fen: string,
  settings: { playerColor: Color; opponent: GameContext["opponent"]; strength: EngineStrength },
  trigger: GameContext["trigger"],
  extras?: { lastMove?: PlayedMove; pgn?: string },
): GameContext {
  const brief = describePosition(fen, {
    strength: settings.strength,
    withEngineHint: trigger !== "user-question",
    lastMove: extras?.lastMove,
    pgn: extras?.pgn,
  });
  return {
    ...brief,
    playerColor: settings.playerColor,
    opponent: settings.opponent,
    strength: settings.strength,
    trigger,
  };
}
