import { tool } from "ai";
import { z } from "zod";
import {
  WordPressFileSchema,
  WordPressHookSchema,
  AcfFieldGroupSchema,
  WordPressCustomPostTypeSchema,
} from "@ai-builder/schemas";

export const wordpressTools = {
  queryProject: tool({
    description:
      "Get the current WordPress project state including all files, hooks, ACF field groups, and custom post types.",
    inputSchema: z.object({}),
  }),

  initProject: tool({
    description:
      "Scaffold a new WordPress theme or plugin with the standard boilerplate files. Call this first when starting a new project.",
    inputSchema: z.object({
      projectType: z.enum(["theme", "plugin"]).describe("WordPress project type"),
      name: z.string().min(1).describe("Human-readable project name, e.g. 'My Portfolio Theme'"),
      slug: z
        .string()
        .regex(/^[a-z0-9-]+$/)
        .describe("Directory and text-domain slug, e.g. 'my-portfolio-theme'"),
      description: z.string().optional().describe("Short description of the project"),
      author: z.string().optional().describe("Author name"),
    }),
  }),

  addFile: tool({
    description: "Add a new PHP, CSS, or JS file to the WordPress project with generated content.",
    inputSchema: z.object({
      file: WordPressFileSchema.describe("The file to add"),
    }),
  }),

  updateFile: tool({
    description: "Update the content of an existing file in the project.",
    inputSchema: z.object({
      fileId: z.string().describe("ID of the file to update (wpf_XXXXXX)"),
      content: z.string().describe("New file content"),
    }),
  }),

  removeFile: tool({
    description: "Remove a file from the project by its ID.",
    inputSchema: z.object({
      fileId: z.string().describe("ID of the file to remove"),
    }),
  }),

  addHook: tool({
    description:
      "Register a WordPress action or filter hook in a specific file. Generates the add_action/add_filter call and the callback function stub.",
    inputSchema: z.object({
      hook: WordPressHookSchema.describe("Hook definition"),
    }),
  }),

  addAcfFieldGroup: tool({
    description:
      "Define an ACF field group using acf_add_local_field_group(). Creates the PHP registration code and adds it to the project's ACF file.",
    inputSchema: z.object({
      group: AcfFieldGroupSchema.describe("ACF field group definition"),
    }),
  }),

  generateCustomPostType: tool({
    description:
      "Register a custom post type (CPT) with proper labels, capabilities, and rewrite rules. Adds the register_post_type() call to the appropriate file.",
    inputSchema: z.object({
      cpt: WordPressCustomPostTypeSchema.describe("Custom post type definition"),
    }),
  }),

  generateTaxonomy: tool({
    description: "Register a custom taxonomy linked to one or more post types.",
    inputSchema: z.object({
      slug: z
        .string()
        .regex(/^[a-z_]{1,32}$/)
        .describe("Taxonomy slug"),
      singular: z.string().describe("Singular label, e.g. 'Project Category'"),
      plural: z.string().describe("Plural label, e.g. 'Project Categories'"),
      postTypes: z.array(z.string()).min(1).describe("Post types to attach taxonomy to"),
      hierarchical: z.boolean().default(true).describe("true = categories-like, false = tags-like"),
    }),
  }),

  addEnqueue: tool({
    description:
      "Add a wp_enqueue_style() or wp_enqueue_script() call to functions.php. Handles both frontend (wp_enqueue_scripts) and admin (admin_enqueue_scripts) contexts.",
    inputSchema: z.object({
      handle: z.string().describe("Unique script/style handle"),
      assetType: z.enum(["style", "script"]).describe("CSS or JS"),
      filePath: z
        .string()
        .describe("Relative path from theme/plugin root, e.g. 'assets/css/main.css'"),
      deps: z.array(z.string()).default([]).describe("Dependency handles, e.g. ['jquery']"),
      inFooter: z.boolean().default(true).describe("Scripts: true = load in footer (recommended)"),
      context: z
        .enum(["frontend", "admin", "both"])
        .default("frontend")
        .describe("Where to enqueue"),
    }),
  }),

  generateShortcode: tool({
    description:
      "Create a WordPress shortcode function that renders a template part. Generates the add_shortcode() call and the callback with ob_start/ob_get_clean pattern.",
    inputSchema: z.object({
      tag: z
        .string()
        .regex(/^[a-z_]+$/)
        .describe("Shortcode tag, e.g. 'my_portfolio'"),
      description: z.string().describe("What the shortcode renders"),
      attributes: z
        .array(
          z.object({
            name: z.string(),
            default: z.string(),
            description: z.string(),
          })
        )
        .default([])
        .describe("Shortcode attributes with defaults"),
    }),
  }),

  generateWidgetArea: tool({
    description: "Register a sidebar/widget area using register_sidebar() in functions.php.",
    inputSchema: z.object({
      id: z.string().describe("Widget area ID, e.g. 'sidebar-1'"),
      name: z.string().describe("Human-readable name, e.g. 'Primary Sidebar'"),
      description: z.string().optional().describe("Optional description"),
    }),
  }),

  addThemeSupport: tool({
    description:
      "Add a WordPress theme support feature to the after_setup_theme hook in functions.php. Common features: post-thumbnails, title-tag, html5, align-wide, editor-styles.",
    inputSchema: z.object({
      feature: z
        .string()
        .describe("Feature name, e.g. 'post-thumbnails', 'title-tag', 'woocommerce'"),
      args: z
        .record(z.string(), z.unknown())
        .optional()
        .describe("Optional feature arguments, e.g. {height: 100, width: 400} for custom-logo"),
    }),
  }),

  generateRestEndpoint: tool({
    description:
      "Register a custom WP REST API route with proper permission callbacks, argument validation, and response handling.",
    inputSchema: z.object({
      namespace: z.string().describe("REST namespace, e.g. 'my-plugin/v1'"),
      route: z.string().describe("Route path, e.g. '/items' or '/items/(?P<id>[\\d]+)'"),
      methods: z.array(z.enum(["GET", "POST", "PUT", "PATCH", "DELETE"])).min(1),
      requireAuth: z
        .boolean()
        .default(false)
        .describe("If true, uses current_user_can check; if false, uses __return_true"),
      args: z
        .array(
          z.object({
            name: z.string(),
            type: z.enum(["string", "integer", "boolean", "array"]),
            required: z.boolean().default(false),
          })
        )
        .default([])
        .describe("Endpoint arguments with validation"),
    }),
  }),

  addCustomImageSize: tool({
    description:
      "Register a custom image size with add_image_size() in functions.php and expose it in the Media Library.",
    inputSchema: z.object({
      slug: z.string().describe("Image size slug, e.g. 'hero-image'"),
      width: z.number().int().positive(),
      height: z.number().int().positive(),
      crop: z.boolean().default(true).describe("Hard crop (true) or soft crop (false)"),
      label: z.string().describe("Human-readable label for Media Library"),
    }),
  }),

  generateAcfBlock: tool({
    description:
      "Create an ACF Gutenberg block using acf_register_block_type() with a render template and associated field group.",
    inputSchema: z.object({
      blockName: z.string().describe("Block name slug, e.g. 'hero-section'"),
      title: z.string().describe("Human-readable block title"),
      description: z.string().optional(),
      icon: z.string().default("layout").describe("Dashicon name or SVG"),
      category: z.enum(["common", "layout", "formatting", "widgets", "embed"]).default("layout"),
      keywords: z.array(z.string()).default([]),
    }),
  }),

  retrieveDocs: tool({
    description:
      "Search WordPress and ACF documentation for hooks, functions, patterns, and best practices.",
    inputSchema: z.object({
      query: z.string().describe("Natural language search query"),
    }),
  }),
};
