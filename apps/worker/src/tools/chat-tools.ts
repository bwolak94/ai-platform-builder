import { tool } from "ai";
import { z } from "zod";

/**
 * Client-side General Chat tools — no execute() function.
 * These are dispatched to the browser via onToolCall.
 */
export const chatTools = {
  runCode: tool({
    description:
      "Execute JavaScript code in the user's browser sandbox and return stdout / return value. " +
      "Use for quick calculations, data transformations, and proof-of-concept snippets.",
    inputSchema: z.object({
      code: z.string().describe("JavaScript code to execute"),
      label: z
        .string()
        .optional()
        .describe("Short label for the artifact, e.g. 'Fibonacci result'"),
    }),
  }),

  transformJson: tool({
    description:
      "Apply a dot-notation JSONPath query to a JSON blob and return the matching value(s). " +
      "Use to drill into API responses or config files shown in the conversation.",
    inputSchema: z.object({
      json: z.string().describe("Raw JSON string to query"),
      query: z
        .string()
        .describe("Dot-notation path, e.g. 'users[0].email' or 'data.items' or '$' for root"),
      label: z.string().optional().describe("Label for the result artifact"),
    }),
  }),

  diffText: tool({
    description:
      "Show a line-by-line diff of two text strings, highlighting additions and removals.",
    inputSchema: z.object({
      textA: z.string().describe("Original text"),
      textB: z.string().describe("New / modified text"),
      title: z.string().optional().describe("Diff title shown in the artifact card"),
    }),
  }),

  calculateTokens: tool({
    description:
      "Estimate the token count for a piece of text using a model-specific approximation. " +
      "Useful when crafting prompts or checking context-window budget.",
    inputSchema: z.object({
      text: z.string().describe("Text to measure"),
      model: z
        .enum(["claude", "gpt-4", "gpt-3.5"])
        .optional()
        .describe("Model family for the approximation (default: claude)"),
    }),
  }),

  encodeDecodeText: tool({
    description:
      "Encode or decode text using Base64, URL encoding, hex, or SHA-256 hash. " +
      "Useful for inspecting JWTs, query strings, and binary data.",
    inputSchema: z.object({
      text: z.string().describe("Input text"),
      operation: z
        .enum([
          "base64encode",
          "base64decode",
          "urlencode",
          "urldecode",
          "hexencode",
          "hexdecode",
          "sha256",
        ])
        .describe("Encoding/decoding operation to apply"),
    }),
  }),
};
