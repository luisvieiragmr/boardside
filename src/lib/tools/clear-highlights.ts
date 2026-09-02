import { tool, type UIToolInvocation } from "ai";
import { z } from "zod";

export const clearHighlightsTool = tool({
  description: "Remove every arrow and square tint from the board.",
  inputSchema: z.object({ reason: z.string().optional() }),
  execute: async (input) => ({ cleared: true, reason: input.reason ?? "reset" }),
});

export type ClearHighlightsInvocation = UIToolInvocation<typeof clearHighlightsTool>;
