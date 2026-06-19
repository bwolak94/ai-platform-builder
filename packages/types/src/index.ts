// Shared TypeScript types across apps and packages

export type BuilderMode =
  | "form"
  | "layout"
  | "api"
  | "db"
  | "email"
  | "story"
  | "i18n"
  | "e2e"
  | "wordpress";

export interface BuilderModeConfig {
  id: BuilderMode;
  label: string;
  description: string;
}

export const BUILDER_MODES: BuilderModeConfig[] = [
  { id: "form", label: "Form Builder", description: "Generate and modify HTML forms" },
  { id: "layout", label: "Layout Builder", description: "Generate page layouts with Tailwind CSS" },
  { id: "api", label: "API Schema", description: "Generate OpenAPI 3.1 specifications" },
  { id: "db", label: "DB Schema", description: "Generate SQL and Prisma database schemas" },
  { id: "email", label: "Email Template", description: "Generate email-client-compatible HTML" },
  { id: "story", label: "Story Builder", description: "Generate Storybook .stories.tsx files" },
  { id: "i18n", label: "i18n Manager", description: "Manage translations across all modules" },
  { id: "e2e", label: "E2E Tests", description: "Generate Playwright test specs" },
  {
    id: "wordpress",
    label: "WordPress Builder",
    description: "Build WordPress themes and plugins with ACF",
  },
];

export interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "tool";
  content: string;
  timestamp: number;
}

export interface ToolCallRecord {
  toolName: string;
  args: unknown;
  result: unknown;
  durationMs: number;
}
