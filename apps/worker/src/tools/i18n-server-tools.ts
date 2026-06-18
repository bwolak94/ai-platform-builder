import { tool, generateText } from "ai";
import { createAnthropic } from "@ai-sdk/anthropic";
import { z } from "zod";

/**
 * Server-side tools for i18n mode that require LLM access.
 * These run entirely on the worker — no client handler needed.
 * The agent calls autoTranslate, receives translations, then calls bulkSetTranslations.
 */
export function buildI18nServerTools(anthropicApiKey: string) {
  const anthropic = createAnthropic({ apiKey: anthropicApiKey });

  return {
    autoTranslate: tool({
      description:
        "Use AI (Claude Haiku) to translate source text into target languages. " +
        "Returns a translations map that should then be applied via bulkSetTranslations. " +
        "Ideal for batch-filling missing translations across many languages at once.",
      inputSchema: z.object({
        key: z.string().describe("The dot-notation key being translated (for context)"),
        sourceText: z.string().describe("The source text to translate"),
        sourceLang: z.string().describe("ISO language code of the source text"),
        targetLanguages: z
          .array(z.string())
          .describe("List of ISO language codes to translate into"),
        context: z.string().optional().describe("Optional translator context note"),
      }),
      execute: async ({ key, sourceText, sourceLang, targetLanguages, context }) => {
        if (!targetLanguages.length) {
          return { key, translations: {} };
        }

        const contextNote = context ? `\nTranslator context: ${context}` : "";
        const prompt =
          `Translate the following text from ${sourceLang} into these languages: ` +
          `${targetLanguages.join(", ")}.${contextNote}\n\n` +
          `Source text: "${sourceText}"\n\n` +
          `Return ONLY a valid JSON object mapping ISO language code to translation string. ` +
          `No explanation, no markdown fences, just the JSON object.\n` +
          `Example for de, fr: {"de": "Anmelden", "fr": "Se connecter"}`;

        try {
          const { text } = await generateText({
            model: anthropic("claude-haiku-4-5-20251001"),
            prompt,
            maxOutputTokens: 1024,
          });

          // Extract JSON — handles cases where the model adds surrounding text
          const jsonMatch = /\{[\s\S]*\}/.exec(text);
          if (!jsonMatch) {
            return { key, translations: {}, error: "No JSON found in model response" };
          }

          const translations = JSON.parse(jsonMatch[0]) as Record<string, string>;
          return { key, translations };
        } catch (err) {
          return {
            key,
            translations: {},
            error: err instanceof Error ? err.message : "Translation failed",
          };
        }
      },
    }),
  };
}
