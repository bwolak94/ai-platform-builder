import { z } from "zod";

// ─── File ─────────────────────────────────────────────────────────────────────

export const WP_FILE_TYPES = ["php", "css", "js", "txt", "json"] as const;

export const WordPressFileSchema = z.object({
  id: z
    .string()
    .regex(/^wpf_[a-z0-9]{6}$/, "File id must match wpf_XXXXXX")
    .describe("Unique file ID"),
  path: z.string().min(1).describe("Relative path from project root, e.g. inc/enqueue.php"),
  content: z.string().describe("File source content"),
  type: z.enum(WP_FILE_TYPES).describe("File type for syntax highlighting"),
});

export type WordPressFile = z.infer<typeof WordPressFileSchema>;

// ─── Hook ─────────────────────────────────────────────────────────────────────

export const WordPressHookSchema = z.object({
  hookName: z.string().min(1).describe("WordPress hook name, e.g. wp_enqueue_scripts"),
  hookType: z.enum(["action", "filter"]).describe("add_action vs add_filter"),
  callbackFn: z.string().min(1).describe("Callback function name"),
  priority: z.number().int().min(0).default(10).describe("Hook priority (default 10)"),
  fileId: z.string().describe("ID of the file this hook lives in"),
});

export type WordPressHook = z.infer<typeof WordPressHookSchema>;

// ─── ACF Field Group ──────────────────────────────────────────────────────────

export const ACF_FIELD_TYPES = [
  "text",
  "textarea",
  "number",
  "email",
  "url",
  "password",
  "image",
  "file",
  "wysiwyg",
  "oembed",
  "gallery",
  "select",
  "checkbox",
  "radio",
  "true_false",
  "link",
  "post_object",
  "page_link",
  "relationship",
  "taxonomy",
  "user",
  "google_map",
  "date_picker",
  "color_picker",
  "repeater",
  "flexible_content",
  "group",
  "clone",
] as const;

export const AcfFieldSchema = z.object({
  key: z.string().describe("Unique field key, e.g. field_abc123"),
  name: z.string().describe("Field name (snake_case), e.g. hero_image"),
  label: z.string().describe("Human-readable label"),
  type: z.enum(ACF_FIELD_TYPES).describe("ACF field type"),
  required: z.boolean().default(false),
  instructions: z.string().optional().describe("Helper text shown below the field"),
});

export type AcfField = z.infer<typeof AcfFieldSchema>;

export const AcfFieldGroupSchema = z.object({
  id: z.string().regex(/^acfg_[a-z0-9]{6}$/, "Group id must match acfg_XXXXXX"),
  title: z.string().min(1).describe("Group title shown in WP admin"),
  key: z.string().describe("Unique group key, e.g. group_abc123"),
  fields: z.array(AcfFieldSchema).describe("Fields in this group"),
  locationPostType: z.array(z.string()).default([]).describe("Post types this group applies to"),
  locationTemplate: z
    .array(z.string())
    .default([])
    .describe("Page templates this group applies to"),
});

export type AcfFieldGroup = z.infer<typeof AcfFieldGroupSchema>;

// ─── Custom Post Type ─────────────────────────────────────────────────────────

export const WordPressCustomPostTypeSchema = z.object({
  slug: z.string().regex(/^[a-z_]{1,20}$/, "CPT slug must be lowercase, max 20 chars"),
  singular: z.string().describe("Singular label, e.g. Portfolio Item"),
  plural: z.string().describe("Plural label, e.g. Portfolio Items"),
  icon: z.string().default("dashicons-admin-post").describe("Dashicon slug"),
  supports: z
    .array(z.enum(["title", "editor", "thumbnail", "excerpt", "author", "comments", "revisions"]))
    .default(["title", "editor", "thumbnail"]),
  public: z.boolean().default(true),
  hasArchive: z.boolean().default(false),
});

export type WordPressCustomPostType = z.infer<typeof WordPressCustomPostTypeSchema>;

// ─── Project ──────────────────────────────────────────────────────────────────

export const WordPressProjectSchema = z.object({
  id: z.string().describe("Project ID"),
  projectType: z.enum(["theme", "plugin"]).describe("WordPress theme or plugin"),
  name: z.string().min(1).describe("Human-readable project name"),
  slug: z
    .string()
    .regex(/^[a-z0-9-]+$/, "Slug must be lowercase letters, numbers, hyphens")
    .describe("Directory / text-domain slug"),
  version: z.string().default("1.0.0"),
  description: z.string().default(""),
  author: z.string().default(""),
  files: z.array(WordPressFileSchema).default([]),
  hooks: z.array(WordPressHookSchema).default([]),
  acfGroups: z.array(AcfFieldGroupSchema).default([]),
  customPostTypes: z.array(WordPressCustomPostTypeSchema).default([]),
});

export type WordPressProject = z.infer<typeof WordPressProjectSchema>;
