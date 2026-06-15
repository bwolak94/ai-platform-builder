import type { BuilderMode, Context } from "../types";
import { buildFormSystemPrompt } from "./form-prompt";
import { buildLayoutSystemPrompt } from "./layout-prompt";
import { buildApiSystemPrompt } from "./api-prompt";
import { buildDbSystemPrompt } from "./db-prompt";
import { buildEmailSystemPrompt } from "./email-prompt";
import { buildStorySystemPrompt } from "./story-prompt";
import { buildI18nSystemPrompt } from "./i18n-prompt";
import { buildE2eSystemPrompt } from "./e2e-prompt";

const DSL_KEY: Record<BuilderMode, keyof Context> = {
  form: "formSchema",
  layout: "layoutTree",
  api: "apiSpec",
  db: "dbSchema",
  email: "emailTemplate",
  story: "storyFile",
  i18n: "i18nStore",
  e2e: "testFile",
};

export function buildSystemPrompt(mode: BuilderMode, context: Context): string {
  const dsl = context[DSL_KEY[mode]];

  switch (mode) {
    case "form":
      return buildFormSystemPrompt(dsl);
    case "layout":
      return buildLayoutSystemPrompt(dsl);
    case "api":
      return buildApiSystemPrompt(dsl);
    case "db":
      return buildDbSystemPrompt(dsl);
    case "email":
      return buildEmailSystemPrompt(dsl);
    case "story":
      return buildStorySystemPrompt(dsl);
    case "i18n":
      return buildI18nSystemPrompt(dsl);
    case "e2e":
      return buildE2eSystemPrompt(dsl);
  }
}
