import type { ToolSet } from "ai";
import type { BuilderMode } from "../types";
import { formTools } from "./form-tools";
import { layoutTools } from "./layout-tools";
import { apiTools } from "./api-tools";
import { dbTools } from "./db-tools";
import { emailTools } from "./email-tools";
import { storyTools } from "./story-tools";
import { i18nTools } from "./i18n-tools";
import { e2eTools } from "./e2e-tools";
import { wordpressTools } from "./wordpress-tools";

// Each tool module exports client-side tools (no execute) for one builder mode.
// The double cast is necessary because TypeScript's strict mode prevents direct
// assignment from Tool<specific, never> to the ToolSet union type.
function asToolSet(tools: Record<string, unknown>): ToolSet {
  return tools as unknown as ToolSet;
}

export function getToolsForMode(mode: BuilderMode): ToolSet {
  switch (mode) {
    case "form":
      return asToolSet(formTools);
    case "layout":
      return asToolSet(layoutTools);
    case "api":
      return asToolSet(apiTools);
    case "db":
      return asToolSet(dbTools);
    case "email":
      return asToolSet(emailTools);
    case "story":
      return asToolSet(storyTools);
    case "i18n":
      return asToolSet(i18nTools);
    case "e2e":
      return asToolSet(e2eTools);
    case "wordpress":
      return asToolSet(wordpressTools);
  }
}
