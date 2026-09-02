import {
  createAgentUIStreamResponse,
  createUIMessageStream,
  createUIMessageStreamResponse,
} from "ai";
import { chessCoach } from "@/lib/agents/chess-coach";
import { chooseEngineMove } from "@/lib/chess/engine";
import { gameContextSchema } from "@/lib/chess/game-context-schema";
import { annotationToClient, localCoachReply } from "@/lib/chess/local-coach";
import type { GameContext } from "@/lib/chess/types";

function hasGatewayAuth() {
  return Boolean(process.env.AI_GATEWAY_API_KEY || process.env.VERCEL_OIDC_TOKEN);
}

function localStream(game: GameContext) {
  const reply = localCoachReply(game);
  const annotation = annotationToClient(reply.annotation);
  const shouldPlay =
    game.opponent === "coach" &&
    !game.gameOver &&
    game.turn !== game.playerColor &&
    (game.trigger === "after-player-move" || game.trigger === "coach-to-move");
  const replyMove = shouldPlay ? chooseEngineMove(game.fen, game.strength) : null;

  return createUIMessageStream({
    execute({ writer }) {
      writer.write({
        type: "tool-input-available",
        toolCallId: "highlight-local",
        toolName: "highlightBoard",
        input: annotation,
      });
      writer.write({
        type: "tool-output-available",
        toolCallId: "highlight-local",
        output: annotation,
      });
      if (replyMove) {
        const payload = {
          from: replyMove.from,
          to: replyMove.to,
          promotion: replyMove.promotion,
          san: replyMove.san,
          idea: `A natural reply is ${replyMove.san}.`,
        };
        writer.write({
          type: "tool-input-available",
          toolCallId: "play-local",
          toolName: "playOpponentMove",
          input: payload,
        });
        writer.write({
          type: "tool-output-available",
          toolCallId: "play-local",
          output: payload,
        });
      }
      writer.write({ type: "text-start", id: "local-text" });
      writer.write({
        type: "text-delta",
        id: "local-text",
        delta: replyMove ? `${reply.text} I’ll answer with ${replyMove.san}.` : reply.text,
      });
      writer.write({ type: "text-end", id: "local-text" });
    },
  });
}

export async function POST(request: Request) {
  const body = await request.json();
  const parsedGame = gameContextSchema.safeParse(body.game);
  const game = parsedGame.success ? parsedGame.data : undefined;
  const messages = body.messages ?? [];

  if (!hasGatewayAuth() && game) {
    return createUIMessageStreamResponse({ stream: localStream(game) });
  }
  if (!hasGatewayAuth()) {
    return Response.json({ error: "Add AI_GATEWAY_API_KEY for the live coach." }, { status: 401 });
  }
  try {
    return await createAgentUIStreamResponse({
      agent: chessCoach,
      uiMessages: messages,
      options: game ? { game } : undefined,
      abortSignal: request.signal,
    });
  } catch {
    if (game) return createUIMessageStreamResponse({ stream: localStream(game) });
    return Response.json({ error: "Coach unavailable" }, { status: 500 });
  }
}
