import { z } from "zod";

export const gameContextSchema = z.object({
  fen: z.string(),
  pgn: z.string(),
  turn: z.enum(["w", "b"]),
  moveNumber: z.number(),
  inCheck: z.boolean(),
  legalSans: z.array(z.string()),
  lastMove: z.object({
    from: z.string(),
    to: z.string(),
    san: z.string(),
    color: z.enum(["w", "b"]),
    captured: z.string().optional(),
    promotion: z.string().optional(),
  }).optional(),
  engineHint: z.object({
    from: z.string(),
    to: z.string(),
    promotion: z.enum(["q", "r", "b", "n"]).optional(),
    san: z.string(),
    score: z.number(),
  }).optional(),
  tactics: z.array(z.object({
    kind: z.enum(["check", "capture", "hanging", "fork", "mate-threat", "blunder"]),
    text: z.string(),
    squares: z.array(z.string()).optional(),
  })),
  gameOver: z.enum(["checkmate", "stalemate", "draw", "threefold", "insufficient"]).optional(),
  winner: z.enum(["w", "b"]).optional(),
  playerColor: z.enum(["w", "b"]),
  opponent: z.enum(["engine", "coach"]),
  strength: z.enum(["easy", "medium", "hard"]),
  trigger: z.enum(["user-question", "after-player-move", "after-opponent-move", "hint", "new-game", "coach-to-move"]),
});
