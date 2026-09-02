"use client";

import { Button } from "@/components/ui/button";
import type { PlayerColor } from "@/lib/chess/types";

const PIECES = [
  { code: "q", white: "♕", black: "♛", label: "Queen" },
  { code: "r", white: "♖", black: "♜", label: "Rook" },
  { code: "b", white: "♗", black: "♝", label: "Bishop" },
  { code: "n", white: "♘", black: "♞", label: "Knight" },
] as const;

export function PromotionDialog({ color, onPick }: { color: PlayerColor; onPick: (piece: "q" | "r" | "b" | "n") => void }) {
  return (
    <div className="absolute inset-0 z-20 flex items-center justify-center rounded-[14px] bg-black/45 backdrop-blur-[2px]">
      <div className="grid grid-cols-4 gap-2 rounded-2xl border border-border bg-card p-3 shadow-xl">
        {PIECES.map((piece) => (
          <Button key={piece.code} variant="secondary" className="h-16 w-16 text-3xl" onClick={() => onPick(piece.code)} aria-label={`Promote to ${piece.label}`}>
            {color === "w" ? piece.white : piece.black}
          </Button>
        ))}
      </div>
    </div>
  );
}
