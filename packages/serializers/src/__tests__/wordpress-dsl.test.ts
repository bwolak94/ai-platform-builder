import { describe, it, expect } from "vitest";
import {
  serializeWordPressDSL,
  deserializeWordPressDSL,
  makeEmptyWordPressProject,
} from "../wordpress-dsl";
import type { WordPressProject } from "@ai-builder/schemas";

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const minimalTheme: WordPressProject = {
  id: "wp_test01",
  projectType: "theme",
  name: "My Theme",
  slug: "my-theme",
  version: "1.0.0",
  description: "",
  author: "",
  files: [],
  hooks: [],
  acfGroups: [],
  customPostTypes: [],
};

const fullProject: WordPressProject = {
  id: "wp_test02",
  projectType: "plugin",
  name: "My Plugin",
  slug: "my-plugin",
  version: "2.1.0",
  description: "A test plugin",
  author: "Dev",
  files: [
    { id: "wpf_aa0001", path: "my-plugin.php", type: "php", content: "<?php" },
    {
      id: "wpf_aa0002",
      path: "public/css/my-plugin-public.css",
      type: "css",
      content: "/* css */",
    },
  ],
  hooks: [
    {
      fileId: "wpf_aa0001",
      hookType: "action",
      hookName: "init",
      callbackFn: "my_plugin_init",
      priority: 10,
    },
  ],
  acfGroups: [
    {
      id: "acfg_001",
      key: "group_hero_fields",
      title: "hero_fields",
      fields: [
        { key: "field_heading", name: "heading", label: "Heading", type: "text", required: false },
      ],
      locationPostType: ["page"],
      locationTemplate: [],
    },
  ],
  customPostTypes: [
    {
      slug: "portfolio",
      singular: "Portfolio Item",
      plural: "Portfolio Items",
      icon: "dashicons-portfolio",
      supports: ["title", "editor", "thumbnail"],
      public: true,
      hasArchive: true,
    },
  ],
};

// ─── serializeWordPressDSL ─────────────────────────────────────────────────────

describe("serializeWordPressDSL", () => {
  it("serializes a minimal theme with no files", () => {
    const dsl = serializeWordPressDSL(minimalTheme);
    expect(dsl).toMatch(/^WP:theme\|/);
    expect(dsl).toContain("name:My Theme");
    expect(dsl).toContain("slug:my-theme");
    expect(dsl).toContain("ver:1.0.0");
  });

  it("does not include empty author segment", () => {
    const dsl = serializeWordPressDSL(minimalTheme);
    // author is empty — should not appear as "author:"
    expect(dsl).not.toContain("author:");
  });

  it("includes author when set", () => {
    const dsl = serializeWordPressDSL({ ...minimalTheme, author: "Alice" });
    expect(dsl).toContain("author:Alice");
  });

  it("serializes plugin type correctly", () => {
    const dsl = serializeWordPressDSL({ ...minimalTheme, projectType: "plugin" });
    expect(dsl).toMatch(/^WP:plugin\|/);
  });

  it("serializes files with type", () => {
    const dsl = serializeWordPressDSL(fullProject);
    expect(dsl).toContain("FILE:my-plugin.php|php");
    expect(dsl).toContain("FILE:public/css/my-plugin-public.css|css");
  });

  it("attaches hook names to correct file", () => {
    const dsl = serializeWordPressDSL(fullProject);
    // init hook is on wpf_aa0001 = my-plugin.php
    expect(dsl).toContain("FILE:my-plugin.php|php|hooks:init");
    // css file has no hooks
    const cssLine = dsl.split("\n").find((l) => l.startsWith("FILE:public/"));
    expect(cssLine).not.toContain("hooks:");
  });

  it("serializes ACF groups", () => {
    const dsl = serializeWordPressDSL(fullProject);
    expect(dsl).toContain("ACF:hero_fields");
    expect(dsl).toContain("post_type:page");
    expect(dsl).toContain("fields:heading:text");
  });

  it("serializes CPTs", () => {
    const dsl = serializeWordPressDSL(fullProject);
    expect(dsl).toContain("CPT:portfolio");
    expect(dsl).toContain("singular:Portfolio Item");
    expect(dsl).toContain("plural:Portfolio Items");
  });

  it("produces a round-trip stable output (serialize → deserialize → serialize)", () => {
    const dsl1 = serializeWordPressDSL(minimalTheme);
    const partial = deserializeWordPressDSL(dsl1);
    const reconstructed: WordPressProject = {
      ...minimalTheme,
      ...partial,
      files: partial.files ?? [],
      hooks: partial.hooks ?? [],
      acfGroups: partial.acfGroups ?? [],
      customPostTypes: partial.customPostTypes ?? [],
    };
    const dsl2 = serializeWordPressDSL(reconstructed);
    expect(dsl2).toBe(dsl1);
  });
});

// ─── deserializeWordPressDSL ──────────────────────────────────────────────────

describe("deserializeWordPressDSL", () => {
  it("parses project type, name, slug, version", () => {
    const result = deserializeWordPressDSL("WP:theme|name:Cool Theme|slug:cool-theme|ver:2.0.0");
    expect(result.projectType).toBe("theme");
    expect(result.name).toBe("Cool Theme");
    expect(result.slug).toBe("cool-theme");
    expect(result.version).toBe("2.0.0");
  });

  it("defaults unknown type to theme", () => {
    const result = deserializeWordPressDSL("WP:unknown|name:X|slug:x|ver:1.0.0");
    expect(result.projectType).toBe("theme");
  });

  it("parses plugin type", () => {
    const result = deserializeWordPressDSL("WP:plugin|name:My Plugin|slug:my-plugin|ver:1.0.0");
    expect(result.projectType).toBe("plugin");
  });

  it("parses FILE lines into files array", () => {
    const dsl = "WP:theme|name:T|slug:t|ver:1.0.0\nFILE:style.css|css\nFILE:functions.php|php";
    const result = deserializeWordPressDSL(dsl);
    expect(result.files).toHaveLength(2);
    expect(result.files?.[0]?.path).toBe("style.css");
    expect(result.files?.[0]?.type).toBe("css");
    expect(result.files?.[1]?.path).toBe("functions.php");
    expect(result.files?.[1]?.type).toBe("php");
  });

  it("assigns sequential IDs to parsed files", () => {
    const dsl = "WP:theme|name:T|slug:t|ver:1.0.0\nFILE:a.php|php\nFILE:b.css|css";
    const result = deserializeWordPressDSL(dsl);
    const ids = result.files?.map((f) => f.id) ?? [];
    expect(ids[0]).not.toBe(ids[1]);
    expect(ids[0]).toMatch(/^wpf_/);
  });

  it("parses ACF group lines", () => {
    const dsl =
      "WP:theme|name:T|slug:t|ver:1.0.0\nACF:hero_fields|post_type:page|fields:heading:text";
    const result = deserializeWordPressDSL(dsl);
    expect(result.acfGroups).toHaveLength(1);
    expect(result.acfGroups?.[0]?.title).toBe("hero_fields");
    expect(result.acfGroups?.[0]?.locationPostType).toEqual(["page"]);
  });

  it("parses CPT lines", () => {
    const dsl =
      "WP:theme|name:T|slug:t|ver:1.0.0\nCPT:portfolio|singular:Portfolio Item|plural:Portfolio Items|supports:title,editor";
    const result = deserializeWordPressDSL(dsl);
    expect(result.customPostTypes).toHaveLength(1);
    expect(result.customPostTypes?.[0]?.slug).toBe("portfolio");
    expect(result.customPostTypes?.[0]?.singular).toBe("Portfolio Item");
    expect(result.customPostTypes?.[0]?.supports).toEqual(["title", "editor"]);
  });

  it("returns empty arrays when no FILE/ACF/CPT lines present", () => {
    const result = deserializeWordPressDSL("WP:theme|name:T|slug:t|ver:1.0.0");
    expect(result.files).toEqual([]);
    expect(result.acfGroups).toEqual([]);
    expect(result.customPostTypes).toEqual([]);
    expect(result.hooks).toEqual([]);
  });

  it("skips blank lines gracefully", () => {
    const dsl = "WP:theme|name:T|slug:t|ver:1.0.0\n\n\nFILE:style.css|css\n";
    const result = deserializeWordPressDSL(dsl);
    expect(result.files).toHaveLength(1);
  });
});

// ─── makeEmptyWordPressProject ────────────────────────────────────────────────

describe("makeEmptyWordPressProject", () => {
  it("creates a theme project by default", () => {
    const project = makeEmptyWordPressProject();
    expect(project.projectType).toBe("theme");
    expect(project.name).toBe("My Theme");
    expect(project.slug).toBe("my-theme");
    expect(project.version).toBe("1.0.0");
    expect(project.files).toEqual([]);
    expect(project.hooks).toEqual([]);
    expect(project.acfGroups).toEqual([]);
    expect(project.customPostTypes).toEqual([]);
  });

  it("creates a plugin project when specified", () => {
    const project = makeEmptyWordPressProject("plugin");
    expect(project.projectType).toBe("plugin");
    expect(project.name).toBe("My Plugin");
    expect(project.slug).toBe("my-plugin");
  });

  it("generates a unique id each call", () => {
    const a = makeEmptyWordPressProject();
    const b = makeEmptyWordPressProject();
    expect(a.id).not.toBe(b.id);
  });
});
