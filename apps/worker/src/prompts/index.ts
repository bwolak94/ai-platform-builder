import type { BuilderMode, Context } from "../types";
import { buildFormSystemPrompt } from "./form-prompt";
import { buildLayoutSystemPrompt } from "./layout-prompt";
import { buildApiSystemPrompt } from "./api-prompt";
import { buildDbSystemPrompt } from "./db-prompt";
import { buildEmailSystemPrompt } from "./email-prompt";
import { buildStorySystemPrompt } from "./story-prompt";
import { buildI18nSystemPrompt } from "./i18n-prompt";
import { buildE2eSystemPrompt } from "./e2e-prompt";
import { buildWordPressSystemPrompt } from "./wordpress-prompt";
import { buildChatSystemPrompt } from "./chat-prompt";

const DSL_KEY: Record<BuilderMode, keyof Context> = {
  form: "formSchema",
  layout: "layoutTree",
  api: "apiSpec",
  db: "dbSchema",
  email: "emailTemplate",
  story: "storyFile",
  i18n: "i18nStore",
  e2e: "testFile",
  wordpress: "wordpressState",
  chat: "chatContext",
};

function buildMemoriesBlock(memoriesJson: string | null | undefined): string {
  if (!memoriesJson) return "";
  try {
    const pins = JSON.parse(memoriesJson) as string[];
    if (!Array.isArray(pins) || pins.length === 0) return "";
    const lines = pins.map((p, i) => `${String(i + 1)}. ${p}`).join("\n");
    return `\n\n## Pinned Memory\nThe user has pinned the following messages as persistent context. Always keep these in mind:\n${lines}`;
  } catch {
    return "";
  }
}

export function buildSystemPrompt(mode: BuilderMode, context: Context): string {
  const dsl = context[DSL_KEY[mode]];

  let base: string;
  switch (mode) {
    case "form":
      base = buildFormSystemPrompt(dsl);
      break;
    case "layout":
      base = buildLayoutSystemPrompt(dsl);
      break;
    case "api":
      base = buildApiSystemPrompt(dsl);
      break;
    case "db":
      base = buildDbSystemPrompt(dsl);
      break;
    case "email":
      base = buildEmailSystemPrompt(dsl);
      break;
    case "story":
      base = buildStorySystemPrompt(dsl);
      break;
    case "i18n":
      base = buildI18nSystemPrompt(dsl);
      break;
    case "e2e":
      base = buildE2eSystemPrompt(dsl);
      break;
    case "wordpress":
      base = buildWordPressSystemPrompt(dsl);
      break;
    case "chat":
      base = buildChatSystemPrompt(dsl);
      break;
  }

  return base + buildMemoriesBlock(context.memories);
}
