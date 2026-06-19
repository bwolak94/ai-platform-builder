import type {
  WordPressProject,
  WordPressFile,
  WordPressHook,
  AcfFieldGroup,
  WordPressCustomPostType,
} from "@ai-builder/schemas";

// ─── Compact DSL format ───────────────────────────────────────────────────────
//
// WP:theme|name:My Theme|slug:my-theme|ver:1.0.0|author:Dev
// FILE:style.css|css
// FILE:functions.php|php|hooks:wp_enqueue_scripts,after_setup_theme
// ACF:hero_fields|post_type:page,post
// CPT:portfolio|singular:Portfolio Item|plural:Portfolio Items
//
// File contents are NOT included in the DSL — they are too large for context.
// The DSL tracks structure; the full content lives in client state only.

const SEP = "|";
const NL = "\n";

// ─── Serialize ────────────────────────────────────────────────────────────────

function serializeFile(file: WordPressFile, hooks: WordPressHook[]): string {
  const fileHooks = hooks
    .filter((h) => h.fileId === file.id)
    .map((h) => h.hookName)
    .join(",");
  const parts = [`FILE:${file.path}`, file.type];
  if (fileHooks) parts.push(`hooks:${fileHooks}`);
  return parts.join(SEP);
}

function serializeAcfGroup(group: AcfFieldGroup): string {
  const fieldTypes = group.fields.map((f) => `${f.name}:${f.type}`).join(",");
  const location =
    group.locationPostType.length > 0
      ? `post_type:${group.locationPostType.join(",")}`
      : group.locationTemplate.length > 0
        ? `template:${group.locationTemplate.join(",")}`
        : "";
  const parts = [`ACF:${group.title}`, location || "location:global"];
  if (fieldTypes) parts.push(`fields:${fieldTypes}`);
  return parts.join(SEP);
}

function serializeCpt(cpt: WordPressCustomPostType): string {
  return [
    `CPT:${cpt.slug}`,
    `singular:${cpt.singular}`,
    `plural:${cpt.plural}`,
    `supports:${cpt.supports.join(",")}`,
  ].join(SEP);
}

export function serializeWordPressDSL(project: WordPressProject): string {
  const lines: string[] = [];

  // Header
  lines.push(
    [
      `WP:${project.projectType}`,
      `name:${project.name}`,
      `slug:${project.slug}`,
      `ver:${project.version}`,
      project.author ? `author:${project.author}` : null,
    ]
      .filter(Boolean)
      .join(SEP)
  );

  // Files
  for (const file of project.files) {
    lines.push(serializeFile(file, project.hooks));
  }

  // ACF groups
  for (const group of project.acfGroups) {
    lines.push(serializeAcfGroup(group));
  }

  // CPTs
  for (const cpt of project.customPostTypes) {
    lines.push(serializeCpt(cpt));
  }

  return lines.join(NL);
}

// ─── Deserialize ─────────────────────────────────────────────────────────────

function parseKV(value: string): Record<string, string> {
  const result: Record<string, string> = {};
  for (const segment of value.split(SEP)) {
    const colonIdx = segment.indexOf(":");
    if (colonIdx === -1) continue;
    result[segment.slice(0, colonIdx)] = segment.slice(colonIdx + 1);
  }
  return result;
}

export function deserializeWordPressDSL(dsl: string): Partial<WordPressProject> {
  const lines = dsl.split(NL).filter((l) => l.trim());
  const project: Partial<WordPressProject> = {
    files: [],
    hooks: [],
    acfGroups: [],
    customPostTypes: [],
  };

  let fileCounter = 0;
  let groupCounter = 0;

  for (const line of lines) {
    if (line.startsWith("WP:")) {
      const kv = parseKV(line);
      // WP:theme → kv["WP"] = "theme"
      const wpType = line.split(SEP)[0]?.replace("WP:", "");
      project.projectType = wpType === "plugin" ? "plugin" : "theme";
      project.name = kv.name ?? "My Project";
      project.slug = kv.slug ?? "my-project";
      project.version = kv.ver ?? "1.0.0";
      project.author = kv.author ?? "";
    } else if (line.startsWith("FILE:")) {
      const parts = line.split(SEP);
      const path = parts[0]?.replace("FILE:", "") ?? "";
      const type = (parts[1] ?? "php") as WordPressFile["type"];
      const files = project.files ?? [];
      files.push({
        id: `wpf_${String(fileCounter++).padStart(6, "0").slice(0, 6)}`,
        path,
        content: "",
        type,
      });
      project.files = files;
    } else if (line.startsWith("ACF:")) {
      const parts = line.split(SEP);
      const title = parts[0]?.replace("ACF:", "") ?? "";
      const kv = parseKV(parts.slice(1).join(SEP));
      const acfGroups = project.acfGroups ?? [];
      acfGroups.push({
        id: `acfg_${String(groupCounter++).padStart(6, "0").slice(0, 6)}`,
        title,
        key: `group_${title.toLowerCase().replace(/\s+/g, "_")}`,
        fields: [],
        locationPostType: kv.post_type ? kv.post_type.split(",") : [],
        locationTemplate: kv.template ? kv.template.split(",") : [],
      });
      project.acfGroups = acfGroups;
    } else if (line.startsWith("CPT:")) {
      const parts = line.split(SEP);
      const slug = parts[0]?.replace("CPT:", "") ?? "";
      const kv = parseKV(parts.slice(1).join(SEP));
      const customPostTypes = project.customPostTypes ?? [];
      customPostTypes.push({
        slug,
        singular: kv.singular ?? slug,
        plural: kv.plural ?? `${slug}s`,
        icon: "dashicons-admin-post",
        supports: ["title", "editor", "thumbnail"],
        public: true,
        hasArchive: false,
        ...(kv.supports
          ? { supports: kv.supports.split(",") as WordPressCustomPostType["supports"] }
          : {}),
      });
      project.customPostTypes = customPostTypes;
    }
  }

  return project;
}

// ─── Empty project factory ────────────────────────────────────────────────────

export function makeEmptyWordPressProject(
  projectType: "theme" | "plugin" = "theme"
): WordPressProject {
  return {
    id: `wp_${Math.random().toString(36).slice(2, 10)}`,
    projectType,
    name: projectType === "theme" ? "My Theme" : "My Plugin",
    slug: projectType === "theme" ? "my-theme" : "my-plugin",
    version: "1.0.0",
    description: "",
    author: "",
    files: [],
    hooks: [],
    acfGroups: [],
    customPostTypes: [],
  };
}
