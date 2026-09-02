import { tool, type UIToolInvocation } from "ai";
import { z } from "zod";

export const playOpponentMoveTool = tool({
  description: "Play one legal move for the opponent when you are controlling that side.",
  inputSchema: z.object({
    from: z.string(),
    to: z.string(),
    promotion: z.enum(["q", "r", "b", "n"]).optional(),
    san: z.string().optional(),
    idea: z.string(),
  }),
  execute: async (input) => input,
});

export type PlayOpponentMoveInvocation = UIToolInvocation<typeof playOpponentMoveTool>;
