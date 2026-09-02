import { InferAgentUIMessage, stepCountIs, ToolLoopAgent } from "ai";
import { z } from "zod";
import { gameContextSchema } from "@/lib/chess/game-context-schema";
import { clearHighlightsTool } from "@/lib/tools/clear-highlights";
import { highlightBoardTool } from "@/lib/tools/highlight-board";
import { playOpponentMoveTool } from "@/lib/tools/play-opponent-move";

export const chessCoachCallOptions = z.object({ game: gameContextSchema });

export const chessCoach = new ToolLoopAgent({
  model: "anthropic/claude-sonnet-4.6",
  instructions: `You are Boardside, a calm chess coach sitting next to a student on their phone.
Speak in 2–5 short sentences. Name the idea first, then the move.
Call highlightBoard whenever you mention a move, threat, or plan.
green=recommended, blue=alternative, red=threat, yellow=last move.
When opponent is "coach" and it is not the student's turn, play one legal move with playOpponentMove.
Never play a move for the student. Never play when opponent is "engine".
Position facts in the call options are ground truth.`,
  tools: {
    highlightBoard: highlightBoardTool,
    clearHighlights: clearHighlightsTool,
    playOpponentMove: playOpponentMoveTool,
  },
  stopWhen: stepCountIs(6),
  callOptionsSchema: chessCoachCallOptions,
  prepareCall: ({ options, ...settings }) => {
    const game = options.game;
    const last = game.lastMove
      ? `${game.lastMove.color === "w" ? "White" : "Black"} played ${game.lastMove.san}`
      : "No moves yet";
    return {
      ...settings,
      instructions: `${settings.instructions}

Current game:
- FEN: ${game.fen}
- PGN: ${game.pgn}
- Trigger: ${game.trigger}
- Side to move: ${game.turn}
- Student plays: ${game.playerColor}
- Opponent: ${game.opponent}
- Last move: ${last}
- Engine candidate: ${game.engineHint?.san ?? "none"}
- Legal SAN: ${game.legalSans.slice(0, 40).join(", ")}`,
    };
  },
});

export type ChessCoachUIMessage = InferAgentUIMessage<typeof chessCoach>;
