"use client";

import { useMemo } from "react";
import { Chessboard, type SquareHandlerArgs } from "react-chessboard";
import type { Arrow } from "react-chessboard";
import type { BoardAnnotation, HighlightHue, PlayedMove, PlayerColor } from "@/lib/chess/types";
import { HIGHLIGHT_HEX, SQUARE_FILL } from "@/lib/chess/types";

type Props = {
  fen: string;
  orientation: PlayerColor;
  lastMove?: PlayedMove;
  selected?: string | null;
  legalTargets?: string[];
  annotation?: BoardAnnotation | null;
  interactive: boolean;
  canMoveFrom: (square: string) => boolean;
  onDrop: (from: string, to: string) => boolean;
  onSquareClick: (square: string) => void;
};

function mergeSquareStyles(
  lastMove: PlayedMove | undefined,
  selected: string | null | undefined,
  legalTargets: string[],
  annotation: BoardAnnotation | null | undefined,
) {
  const styles: Record<string, React.CSSProperties> = {};
  const paint = (square: string, color: string) => {
    styles[square] = { ...(styles[square] ?? {}), backgroundColor: color };
  };
  if (lastMove) {
    paint(lastMove.from, "rgba(250, 204, 21, 0.28)");
    paint(lastMove.to, "rgba(250, 204, 21, 0.40)");
  }
  if (selected) paint(selected, "rgba(96, 165, 250, 0.45)");
  for (const square of legalTargets) {
    styles[square] = {
      ...(styles[square] ?? {}),
      backgroundImage: "radial-gradient(circle at center, rgba(20, 16, 12, 0.32) 13%, transparent 14%)",
    };
  }
  for (const mark of annotation?.squares ?? []) {
    styles[String(mark.square)] = {
      ...(styles[String(mark.square)] ?? {}),
      backgroundColor: SQUARE_FILL[(mark.color ?? "yellow") as HighlightHue],
    };
  }
  return styles;
}

export function ChessBoardView({
  fen, orientation, lastMove, selected, legalTargets = [], annotation,
  interactive, canMoveFrom, onDrop, onSquareClick,
}: Props) {
  const arrows: Arrow[] = useMemo(
    () => (annotation?.arrows ?? []).map((arrow) => ({
      startSquare: String(arrow.from),
      endSquare: String(arrow.to),
      color: HIGHLIGHT_HEX[arrow.color ?? "green"],
    })),
    [annotation],
  );
  const squareStyles = useMemo(
    () => mergeSquareStyles(lastMove, selected, legalTargets, annotation),
    [annotation, lastMove, legalTargets, selected],
  );
  const options = useMemo(
    () => ({
      id: "boardside",
      position: fen,
      boardOrientation: orientation === "w" ? ("white" as const) : ("black" as const),
      allowDrawingArrows: false,
      allowDragging: interactive,
      animationDurationInMs: 180,
      lightSquareStyle: { backgroundColor: "#ecd2a8" },
      darkSquareStyle: { backgroundColor: "#b58863" },
      squareStyles,
      arrows,
      boardStyle: {
        borderRadius: 14,
        overflow: "hidden" as const,
        boxShadow: "0 18px 50px rgba(0,0,0,0.35)",
        width: "100%",
      },
      canDragPiece: ({ square }: { square: string | null }) =>
        Boolean(interactive && square && canMoveFrom(square)),
      onPieceDrop: ({ sourceSquare, targetSquare }: { sourceSquare: string; targetSquare: string | null }) => {
        if (!targetSquare) return false;
        return onDrop(sourceSquare, targetSquare);
      },
      onSquareClick: ({ square }: SquareHandlerArgs) => onSquareClick(square),
    }),
    [arrows, canMoveFrom, fen, interactive, onDrop, onSquareClick, orientation, squareStyles],
  );
  return (
    <div className="mx-auto w-full max-w-[min(100%,72vh)]">
      <Chessboard options={options} />
    </div>
  );
}
