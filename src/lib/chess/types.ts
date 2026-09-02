import type { Color, Square } from "chess.js";

export type PlayerColor = Color;
export type OpponentKind = "engine" | "coach";
export type EngineStrength = "easy" | "medium" | "hard";
export type HighlightHue = "green" | "blue" | "red" | "yellow";

export type BoardArrow = {
  from: Square | string;
  to: Square | string;
  color?: HighlightHue;
};

export type BoardSquareMark = {
  square: Square | string;
  color?: HighlightHue;
  label?: string;
};

export type BoardAnnotation = {
  title?: string;
  arrows?: BoardArrow[];
  squares?: BoardSquareMark[];
};

export type PlayedMove = {
  from: string;
  to: string;
  san: string;
  color: PlayerColor;
  captured?: string;
  promotion?: string;
};

export type GameSettings = {
  playerColor: PlayerColor;
  opponent: OpponentKind;
  strength: EngineStrength;
  autoCoach: boolean;
};

export type GameOverReason =
  | "checkmate"
  | "stalemate"
  | "draw"
  | "threefold"
  | "insufficient";

export type EngineChoice = {
  from: string;
  to: string;
  promotion?: "q" | "r" | "b" | "n";
  san: string;
  score: number;
};

export type TacticalNote = {
  kind: "check" | "capture" | "hanging" | "fork" | "mate-threat" | "blunder";
  text: string;
  squares?: string[];
};

export type PositionBrief = {
  fen: string;
  pgn: string;
  turn: PlayerColor;
  moveNumber: number;
  inCheck: boolean;
  legalSans: string[];
  lastMove?: PlayedMove;
  engineHint?: EngineChoice;
  tactics: TacticalNote[];
  gameOver?: GameOverReason;
  winner?: PlayerColor;
};

export type GameContext = PositionBrief & {
  playerColor: PlayerColor;
  opponent: OpponentKind;
  strength: EngineStrength;
  trigger:
    | "user-question"
    | "after-player-move"
    | "after-opponent-move"
    | "hint"
    | "new-game"
    | "coach-to-move";
};

export const HIGHLIGHT_HEX: Record<HighlightHue, string> = {
  green: "#34d399",
  blue: "#60a5fa",
  red: "#f87171",
  yellow: "#facc15",
};

export const SQUARE_FILL: Record<HighlightHue, string> = {
  green: "rgba(52, 211, 153, 0.42)",
  blue: "rgba(96, 165, 250, 0.40)",
  red: "rgba(248, 113, 113, 0.42)",
  yellow: "rgba(250, 204, 21, 0.40)",
};

export const DEFAULT_SETTINGS: GameSettings = {
  playerColor: "w",
  opponent: "engine",
  strength: "medium",
  autoCoach: true,
};
