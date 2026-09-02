import { tool, type UIToolInvocation } from "ai";
import { z } from "zod";

const hue = z.enum(["green", "blue", "red", "yellow"]);

export const highlightBoardTool = tool({
  description: "Draw arrows and tint squares on the chessboard so the student can see the idea.",
  inputSchema: z.object({
    title: z.string().optional(),
    arrows: z.array(z.object({
      from: z.string(),
      to: z.string(),
      color: hue.optional(),
    })).optional(),
    squares: z.array(z.object({
      square: z.string(),
      color: hue.optional(),
      label: z.string().optional(),
    })).optional(),
  }),
  execute: async (input) => input,
});

export type HighlightBoardInvocation = UIToolInvocation<typeof highlightBoardTool>;
