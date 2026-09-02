import { chooseEngineMove } from "./engine";
import { HIGHLIGHT_HEX } from "./types";
import type { BoardAnnotation, GameContext } from "./types";

export type LocalCoachReply = { text: string; annotation: BoardAnnotation };

function openingAdvice(context: GameContext): string | null {
  if (context.moveNumber > 8) return null;
  if (!context.lastMove) {
    return context.playerColor === "w"
      ? "You have the white pieces. Occupy the center, develop knights and bishops, then castle."
      : "You have black. Answer the first center pawn, develop quickly, and castle before starting a fight.";
  }
  return "In the opening, fight for the center, develop a new piece each move, and get the king safe.";
}

export function localCoachReply(context: GameContext): LocalCoachReply {
  const last = context.lastMove;
  const hint = context.engineHint;
  const squares = new Set<string>();
  const arrows: BoardAnnotation["arrows"] = [];
  if (last) {
    squares.add(last.from);
    squares.add(last.to);
    arrows.push({ from: last.from, to: last.to, color: "yellow" });
  }
  if (hint && last && hint.san !== last.san) {
    arrows.push({ from: hint.from, to: hint.to, color: "green" });
    squares.add(hint.from);
    squares.add(hint.to);
  } else if (hint && !last) {
    arrows.push({ from: hint.from, to: hint.to, color: "green" });
  }
  for (const tactic of context.tactics) {
    for (const square of tactic.squares ?? []) squares.add(square);
  }

  if (context.gameOver === "checkmate") {
    return {
      text: last ? `${last.san} ends the game. Checkmate — the king has no legal escape.` : "Checkmate.",
      annotation: { title: "Checkmate", arrows, squares: [...squares].map((square) => ({ square, color: "red" })) },
    };
  }
  if (context.gameOver) {
    return {
      text: "The position is a draw. Neither king can be forced into mate from here.",
      annotation: { title: "Draw", arrows, squares: [...squares].map((square) => ({ square })) },
    };
  }
  if (context.trigger === "new-game") {
    const idea = hint ?? chooseEngineMove(context.fen, context.strength);
    const intro = openingAdvice(context) ?? "New game. Look at the whole board before you move.";
    return {
      text: idea ? `${intro} A natural first try is ${idea.san} — I’ll mark it on the board.` : intro,
      annotation: {
        title: "Starting idea",
        arrows: idea ? [{ from: idea.from, to: idea.to, color: "green" }] : arrows,
        squares: idea ? [{ square: idea.from, color: "green" }, { square: idea.to, color: "green" }] : [],
      },
    };
  }
  if (context.trigger === "hint" && hint) {
    return {
      text: `Look at ${hint.san}. It keeps a piece active and asks a question your opponent has to answer.`,
      annotation: {
        title: `Hint · ${hint.san}`,
        arrows: [{ from: hint.from, to: hint.to, color: "green" }],
        squares: [{ square: hint.from, color: "green" }, { square: hint.to, color: "green" }],
      },
    };
  }
  const who = last?.color === context.playerColor ? "You played" : "They played";
  let verdict = "Solid enough — now improve your worst-placed piece.";
  if (hint && last && hint.san !== last.san && hint.score > 80) {
    verdict = `${hint.san} was the stronger try. The idea is often safer or more forcing.`;
  } else if (hint && last && hint.san === last.san) {
    verdict = "That’s one of the strongest moves here. Keep the same idea next.";
  }
  const text = [
    last ? `${who} ${last.san}.` : "Let’s look at the position.",
    ...context.tactics.map((note) => note.text),
    verdict,
    openingAdvice(context) && context.moveNumber <= 8 ? openingAdvice(context) : null,
  ].filter(Boolean).join(" ");
  return {
    text,
    annotation: {
      title: last?.san ?? "Position",
      arrows,
      squares: [...squares].map((square) => ({
        square,
        color: context.tactics.some((note) => note.kind === "hanging" && note.squares?.includes(square))
          ? "red"
          : square === hint?.to
            ? "green"
            : "yellow",
      })),
    },
  };
}

export function annotationToClient(annotation: BoardAnnotation) {
  return {
    title: annotation.title,
    arrows: (annotation.arrows ?? []).map((arrow) => ({
      from: String(arrow.from),
      to: String(arrow.to),
      color: arrow.color ?? "green",
      hex: HIGHLIGHT_HEX[arrow.color ?? "green"],
    })),
    squares: (annotation.squares ?? []).map((mark) => ({
      square: String(mark.square),
      color: mark.color ?? "yellow",
      label: mark.label,
    })),
  };
}
