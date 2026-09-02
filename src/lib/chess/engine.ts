import { Chess, type Color, type Move, type PieceSymbol, type Square } from "chess.js";
import type { EngineChoice, EngineStrength } from "./types";

const PIECE_VALUE: Record<PieceSymbol, number> = {
  p: 100, n: 320, b: 330, r: 500, q: 900, k: 20_000,
};

const MATE = 100_000;

const PST: Record<PieceSymbol, number[]> = {
  p: [0,0,0,0,0,0,0,0, 50,50,50,50,50,50,50,50, 10,10,20,30,30,20,10,10, 5,5,10,25,25,10,5,5, 0,0,0,20,20,0,0,0, 5,-5,-10,0,0,-10,-5,5, 5,10,10,-20,-20,10,10,5, 0,0,0,0,0,0,0,0],
  n: [-50,-40,-30,-30,-30,-30,-40,-50, -40,-20,0,0,0,0,-20,-40, -30,0,10,15,15,10,0,-30, -30,5,15,20,20,15,5,-30, -30,0,15,20,20,15,0,-30, -30,5,10,15,15,10,5,-30, -40,-20,0,5,5,0,-20,-40, -50,-40,-30,-30,-30,-30,-40,-50],
  b: [-20,-10,-10,-10,-10,-10,-10,-20, -10,0,0,0,0,0,0,-10, -10,0,5,10,10,5,0,-10, -10,5,5,10,10,5,5,-10, -10,0,10,10,10,10,0,-10, -10,10,10,10,10,10,10,-10, -10,5,0,0,0,0,5,-10, -20,-10,-10,-10,-10,-10,-10,-20],
  r: [0,0,0,0,0,0,0,0, 5,10,10,10,10,10,10,5, -5,0,0,0,0,0,0,-5, -5,0,0,0,0,0,0,-5, -5,0,0,0,0,0,0,-5, -5,0,0,0,0,0,0,-5, -5,0,0,0,0,0,0,-5, 0,0,0,5,5,0,0,0],
  q: [-20,-10,-10,-5,-5,-10,-10,-20, -10,0,0,0,0,0,0,-10, -10,0,5,5,5,5,0,-10, -5,0,5,5,5,5,0,-5, 0,0,5,5,5,5,0,-5, -10,5,5,5,5,5,0,-10, -10,0,5,0,0,0,0,-10, -20,-10,-10,-5,-5,-10,-10,-20],
  k: [-30,-40,-40,-50,-50,-40,-40,-30, -30,-40,-40,-50,-50,-40,-40,-30, -30,-40,-40,-50,-50,-40,-40,-30, -30,-40,-40,-50,-50,-40,-40,-30, -20,-30,-30,-40,-40,-30,-30,-20, -10,-20,-20,-20,-20,-20,-20,-10, 20,20,0,0,0,0,20,20, 20,30,10,0,0,10,30,20],
};

const DEPTH: Record<EngineStrength, number> = { easy: 2, medium: 3, hard: 4 };
const FILE_CHARS = "abcdefgh";

const OPENING_BOOK: Record<string, string[]> = {
  "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq": ["e4", "d4", "Nf3", "c4"],
  "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq": ["e5", "c5", "Nf6", "e6"],
  "rnbqkbnr/pppppppp/8/8/3P4/8/PPP1PPPP/RNBQKBNR b KQkq": ["d5", "Nf6", "e6"],
  "rnbqkbnr/pppppppp/8/8/8/5N2/PPPPPPPP/RNBQKB1R b KQkq": ["d5", "Nf6"],
  "rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq": ["Nf3", "Nc3", "Bc4"],
  "rnbqkbnr/pp1ppppp/8/2p5/4P3/8/PPPP1PPP/RNBQKBNR w KQkq": ["Nf3", "Nc3", "c3"],
};

function squareIndex(square: Square, color: Color): number {
  const file = FILE_CHARS.indexOf(square[0] ?? "a");
  const rank = Number(square[1]) - 1;
  const mapped = color === "w" ? 7 - rank : rank;
  return mapped * 8 + file;
}

function evaluate(chess: Chess): number {
  if (chess.isCheckmate()) return chess.turn() === "w" ? -MATE : MATE;
  if (chess.isDraw()) return 0;
  let score = 0;
  for (const square of chess.board().flat()) {
    if (!square) continue;
    const value = PIECE_VALUE[square.type] + PST[square.type][squareIndex(square.square, square.color)];
    score += square.color === "w" ? value : -value;
  }
  return score;
}

function orderMoves(moves: Move[]): Move[] {
  return [...moves].sort((a, b) => {
    const aScore = (a.isCapture() ? 10 + (PIECE_VALUE[a.captured ?? "p"] - PIECE_VALUE[a.piece]) : 0) + (a.isPromotion() ? 80 : 0);
    const bScore = (b.isCapture() ? 10 + (PIECE_VALUE[b.captured ?? "p"] - PIECE_VALUE[b.piece]) : 0) + (b.isPromotion() ? 80 : 0);
    return bScore - aScore;
  });
}

function search(chess: Chess, depth: number, alpha: number, beta: number, maximizing: boolean): number {
  if (depth === 0 || chess.isGameOver()) return evaluate(chess);
  const moves = orderMoves(chess.moves({ verbose: true }));
  if (maximizing) {
    let best = -Infinity;
    for (const move of moves) {
      chess.move(move);
      const value = search(chess, depth - 1, alpha, beta, false);
      chess.undo();
      best = Math.max(best, value);
      alpha = Math.max(alpha, value);
      if (beta <= alpha) break;
    }
    return best;
  }
  let best = Infinity;
  for (const move of moves) {
    chess.move(move);
    const value = search(chess, depth - 1, alpha, beta, true);
    chess.undo();
    best = Math.min(best, value);
    beta = Math.min(beta, value);
    if (beta <= alpha) break;
  }
  return best;
}

function pickRandomish(choices: EngineChoice[], strength: EngineStrength): EngineChoice {
  if (choices.length === 0) throw new Error("No legal moves");
  if (strength === "hard") return choices[0]!;
  const window = strength === "easy" ? Math.min(4, choices.length) : Math.min(2, choices.length);
  const pool = choices.slice(0, window);
  const top = pool[0]!.score;
  const close = pool.filter((choice) => Math.abs(choice.score - top) < (strength === "easy" ? 60 : 25));
  return close[Math.floor(Math.random() * close.length)] ?? pool[0]!;
}

function fenKey(fen: string) {
  return fen.split(" ").slice(0, 3).join(" ");
}

function bookMove(chess: Chess, strength: EngineStrength): EngineChoice | null {
  const options = OPENING_BOOK[fenKey(chess.fen())];
  if (!options?.length) return null;
  const pick =
    strength === "hard"
      ? options[0]
      : options[Math.floor(Math.random() * (strength === "easy" ? options.length : Math.min(2, options.length)))];
  try {
    const move = chess.move(pick!);
    chess.undo();
    return { from: move.from, to: move.to, promotion: move.promotion as EngineChoice["promotion"], san: move.san, score: 35 };
  } catch {
    return null;
  }
}

export function chooseEngineMove(fen: string, strength: EngineStrength = "medium"): EngineChoice | null {
  const chess = new Chess(fen);
  const fromBook = bookMove(chess, strength);
  if (fromBook) return fromBook;
  const moves = chess.moves({ verbose: true });
  if (moves.length === 0) return null;
  const depth = DEPTH[strength];
  const maximizing = chess.turn() === "w";
  const scored: EngineChoice[] = [];
  for (const move of orderMoves(moves)) {
    chess.move(move);
    const score = search(chess, depth - 1, -Infinity, Infinity, chess.turn() === "w");
    chess.undo();
    scored.push({
      from: move.from,
      to: move.to,
      promotion: move.promotion as EngineChoice["promotion"],
      san: move.san,
      score: maximizing ? score : -score,
    });
  }
  scored.sort((a, b) => b.score - a.score);
  return pickRandomish(scored, strength);
}

export function scoreToLabel(score: number): string {
  if (score > 8_000) return "mate";
  if (score < -8_000) return "mated";
  const pawns = (score / 100).toFixed(1);
  return score > 0 ? `+${pawns}` : pawns;
}
