import type { BuilderMode, BuilderModeConfig } from "@ai-builder/types";

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
  {
    id: "chat",
    label: "General Chat",
    description: "AI assistant with web search, code execution, and 20 tools",
  },
];

export const DEFAULT_MODE: BuilderMode = "form";

// In production set VITE_AGENT_URL; in dev leave unset so the Vite proxy (→ :8787) handles /agents/*
export const AGENT_URL: string | undefined = import.meta.env.VITE_AGENT_URL;
