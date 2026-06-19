import { z } from "zod";

export interface Env {
  BuilderAgent: DurableObjectNamespace;
  OPENAI_API_KEY: string;
  ANTHROPIC_API_KEY: string;
  UPSTASH_URL: string;
  UPSTASH_TOKEN: string;
  BRAINTRUST_API_KEY: string;
  BRAINTRUST_API_URL?: string;
  APP_ENV: string;
  // Optional: set to enable "Send test email" feature via Resend
  RESEND_API_KEY?: string;
}

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

export const BUILDER_MODES = [
  "form",
  "layout",
  "api",
  "db",
  "email",
  "story",
  "i18n",
  "e2e",
  "wordpress",
] as const;

export const ContextSchema = z.object({
  formSchema: z.string().nullable().optional(),
  layoutTree: z.string().nullable().optional(),
  apiSpec: z.string().nullable().optional(),
  dbSchema: z.string().nullable().optional(),
  emailTemplate: z.string().nullable().optional(),
  storyFile: z.string().nullable().optional(),
  i18nStore: z.string().nullable().optional(),
  testFile: z.string().nullable().optional(),
  wordpressState: z.string().nullable().optional(),
});

export interface SnapshotEntry {
  id: string;
  name: string;
  createdAt: number;
  context: Context;
}

export const IncomingMessageSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("cf_agent_use_chat_request"),
    id: z.string(),
    init: z.object({
      method: z.string(),
      body: z.string(),
    }),
  }),
  z.object({
    type: z.literal("cf_agent_chat_init"),
  }),
  z.object({
    type: z.literal("cf_agent_chat_clear"),
  }),
  z.object({
    type: z.literal("set_mode"),
    mode: z.enum(["form", "layout", "api", "db", "email", "story", "i18n", "e2e", "wordpress"]),
  }),
  z.object({
    type: z.literal("update_context"),
    context: ContextSchema,
  }),
  z.object({
    type: z.literal("save_snapshot"),
    name: z.string().min(1).max(80),
  }),
]);

export type Context = z.infer<typeof ContextSchema>;
