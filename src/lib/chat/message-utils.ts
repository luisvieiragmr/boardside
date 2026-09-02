import type { ChessCoachUIMessage } from "@/lib/agents/chess-coach";
import type { BoardAnnotation, HighlightHue } from "@/lib/chess/types";

export function messageText(message: ChessCoachUIMessage): string {
  return message.parts
    .filter((part): part is { type: "text"; text: string } => part.type === "text")
    .map((part) => part.text)
    .join("")
    .trim();
}

export function lastAssistantMessage(messages: ChessCoachUIMessage[]) {
  return [...messages].reverse().find((message) => message.role === "assistant");
}

function asHue(value: unknown): HighlightHue {
  if (value === "green" || value === "blue" || value === "red" || value === "yellow") return value;
  return "yellow";
}

export function annotationFromMessages(messages: ChessCoachUIMessage[]): BoardAnnotation | null {
  for (const message of [...messages].reverse()) {
    for (const part of [...message.parts].reverse()) {
      if (part.type === "tool-clearHighlights" && part.state === "output-available") {
        return { arrows: [], squares: [] };
      }
      if (part.type === "tool-highlightBoard" && part.state !== "input-streaming") {
        const input = part.input;
        if (!input) continue;
        return {
          title: input.title,
          arrows: (input.arrows ?? []).map((arrow) => ({
            from: arrow.from, to: arrow.to, color: asHue(arrow.color),
          })),
          squares: (input.squares ?? []).map((mark) => ({
            square: mark.square, color: asHue(mark.color), label: mark.label,
          })),
        };
      }
    }
  }
  return null;
}

export function pendingOpponentMoves(messages: ChessCoachUIMessage[]) {
  const moves: Array<{ id: string; from: string; to: string; promotion?: "q" | "r" | "b" | "n"; idea?: string; san?: string }> = [];
  for (const message of messages) {
    for (const part of message.parts) {
      if (part.type !== "tool-playOpponentMove") continue;
      if (part.state !== "output-available" && part.state !== "input-available") continue;
      const input = part.input;
      if (!input?.from || !input.to) continue;
      moves.push({
        id: part.toolCallId,
        from: input.from,
        to: input.to,
        promotion: input.promotion,
        idea: input.idea,
        san: input.san,
      });
    }
  }
  return moves;
}
