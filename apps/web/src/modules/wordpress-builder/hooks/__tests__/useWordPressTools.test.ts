import { describe, it, expect } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useState } from "react";
import { useWordPressTools } from "../useWordPressTools";
import { makeEmptyWordPressProject } from "@ai-builder/serializers";
import type { WordPressProject } from "@ai-builder/schemas";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function renderTools(initial?: Partial<WordPressProject>) {
  const project: WordPressProject = { ...makeEmptyWordPressProject("theme"), ...initial };

  const { result } = renderHook(() => {
    const [proj, setProject] = useState<WordPressProject>(project);
    const [activeFileId, setActiveFileId] = useState<string | null>(null);
    const tools = useWordPressTools(proj, setProject, setActiveFileId);
    return { proj, activeFileId, tools };
  });

  return result;
}

// ─── queryProject ─────────────────────────────────────────────────────────────

describe("queryProject", () => {
  it("returns project summary with filePaths array", async () => {
    const result = renderTools();
    const data = await result.current.tools.queryProject();
    expect(data.project).toBeDefined();
    expect(Array.isArray(data.project.filePaths)).toBe(true);
    expect(data.project.filePaths).toHaveLength(0);
  });
});

// ─── initProject ─────────────────────────────────────────────────────────────

describe("initProject", () => {
  it("creates theme boilerplate with 9 files", async () => {
    const result = renderTools();
    await act(async () => {
      await result.current.tools.initProject({
        projectType: "theme",
        name: "Awesome Theme",
        slug: "awesome-theme",
      });
    });
    expect(result.current.proj.files.length).toBe(9);
    expect(result.current.proj.name).toBe("Awesome Theme");
    expect(result.current.proj.slug).toBe("awesome-theme");
    expect(result.current.proj.projectType).toBe("theme");
  });

  it("creates plugin boilerplate with 7 files", async () => {
    const result = renderTools();
    await act(async () => {
      await result.current.tools.initProject({
        projectType: "plugin",
        name: "Cool Plugin",
        slug: "cool-plugin",
      });
    });
    expect(result.current.proj.files.length).toBe(7);
    expect(result.current.proj.projectType).toBe("plugin");
  });

  it("sets active file to first file after init", async () => {
    const result = renderTools();
    await act(async () => {
      await result.current.tools.initProject({
        projectType: "theme",
        name: "T",
        slug: "t",
      });
    });
    const firstFileId = result.current.proj.files[0]?.id;
    expect(result.current.activeFileId).toBe(firstFileId);
  });

  it("theme style.css starts with Theme Name comment", async () => {
    const result = renderTools();
    await act(async () => {
      await result.current.tools.initProject({
        projectType: "theme",
        name: "My Theme",
        slug: "my-theme",
      });
    });
    const styleCss = result.current.proj.files.find((f) => f.path === "style.css");
    expect(styleCss?.content).toContain("Theme Name: My Theme");
  });

  it("plugin main file starts with Plugin Name comment", async () => {
    const result = renderTools();
    await act(async () => {
      await result.current.tools.initProject({
        projectType: "plugin",
        name: "Test Plugin",
        slug: "test-plugin",
      });
    });
    const mainFile = result.current.proj.files.find((f) => f.path === "test-plugin.php");
    expect(mainFile?.content).toContain("Plugin Name:       Test Plugin");
  });
});

// ─── addFile ──────────────────────────────────────────────────────────────────

describe("addFile", () => {
  it("adds a valid file to the project", async () => {
    const result = renderTools();
    await act(async () => {
      await result.current.tools.addFile({
        file: {
          id: "wpf_aaaaaa",
          path: "inc/helpers.php",
          type: "php",
          content: "<?php",
        },
      });
    });
    expect(result.current.proj.files).toHaveLength(1);
    expect(result.current.proj.files[0]?.path).toBe("inc/helpers.php");
  });

  it("returns error for invalid file schema", async () => {
    const result = renderTools();
    let out: Record<string, unknown> = {};
    await act(async () => {
      out = await result.current.tools.addFile({ file: { id: "bad" } });
    });
    expect(out.error).toBeDefined();
    expect(result.current.proj.files).toHaveLength(0);
  });

  it("rejects duplicate paths", async () => {
    const result = renderTools();
    const file = { id: "wpf_aaaaaa", path: "inc/helpers.php", type: "php", content: "" };

    await act(async () => {
      await result.current.tools.addFile({ file });
    });

    let out: Record<string, unknown> = {};
    await act(async () => {
      out = await result.current.tools.addFile({ file: { ...file, id: "wpf_bbbbbb" } });
    });

    expect(out.error).toContain("already exists");
    expect(result.current.proj.files).toHaveLength(1);
  });
});

// ─── updateFile ───────────────────────────────────────────────────────────────

describe("updateFile", () => {
  it("updates file content by id", async () => {
    const result = renderTools();
    await act(async () => {
      await result.current.tools.addFile({
        file: { id: "wpf_aaaaaa", path: "style.css", type: "css", content: "/* old */" },
      });
    });
    await act(async () => {
      await result.current.tools.updateFile({ fileId: "wpf_aaaaaa", content: "/* new */" });
    });
    expect(result.current.proj.files[0]?.content).toBe("/* new */");
  });

  it("returns error for unknown file id", async () => {
    const result = renderTools();
    let out: Record<string, unknown> = {};
    await act(async () => {
      out = await result.current.tools.updateFile({ fileId: "wpf_nope", content: "" });
    });
    expect(out.error).toContain("not found");
  });
});

// ─── removeFile ───────────────────────────────────────────────────────────────

describe("removeFile", () => {
  it("removes a file by id", async () => {
    const result = renderTools();
    await act(async () => {
      await result.current.tools.addFile({
        file: { id: "wpf_aaaaaa", path: "style.css", type: "css", content: "" },
      });
    });
    await act(async () => {
      await result.current.tools.removeFile({ fileId: "wpf_aaaaaa" });
    });
    expect(result.current.proj.files).toHaveLength(0);
  });
});

// ─── generateCustomPostType ───────────────────────────────────────────────────

describe("generateCustomPostType", () => {
  it("adds CPT code to functions.php", async () => {
    const result = renderTools();
    // First init a theme to have functions.php
    await act(async () => {
      await result.current.tools.initProject({ projectType: "theme", name: "T", slug: "t" });
    });
    await act(async () => {
      await result.current.tools.generateCustomPostType({
        cpt: {
          slug: "portfolio",
          singular: "Portfolio Item",
          plural: "Portfolio Items",
          icon: "dashicons-portfolio",
          supports: ["title", "editor"],
          public: true,
          hasArchive: false,
        },
      });
    });
    expect(result.current.proj.customPostTypes).toHaveLength(1);
    const fnFile = result.current.proj.files.find((f) => f.path === "functions.php");
    expect(fnFile?.content).toContain("register_post_type");
    expect(fnFile?.content).toContain("portfolio");
  });

  it("returns error when no functions.php exists", async () => {
    const result = renderTools();
    let out: Record<string, unknown> = {};
    await act(async () => {
      out = await result.current.tools.generateCustomPostType({
        cpt: {
          slug: "portfolio",
          singular: "Portfolio Item",
          plural: "Portfolio Items",
          icon: "dashicons-portfolio",
          supports: ["title"],
          public: true,
          hasArchive: false,
        },
      });
    });
    expect(out.error).toBeDefined();
  });
});

// ─── generateShortcode ────────────────────────────────────────────────────────

describe("generateShortcode", () => {
  it("appends shortcode to functions.php", async () => {
    const result = renderTools();
    await act(async () => {
      await result.current.tools.initProject({ projectType: "theme", name: "T", slug: "t" });
    });
    await act(async () => {
      await result.current.tools.generateShortcode({
        tag: "my_button",
        description: "A custom button",
        attributes: [{ name: "label", default: "Click me", description: "Button label" }],
      });
    });
    const fnFile = result.current.proj.files.find((f) => f.path === "functions.php");
    expect(fnFile?.content).toContain("add_shortcode");
    expect(fnFile?.content).toContain("my_button");
  });
});

// ─── generateRestEndpoint ─────────────────────────────────────────────────────

describe("generateRestEndpoint", () => {
  it("appends REST endpoint registration to functions.php", async () => {
    const result = renderTools();
    await act(async () => {
      await result.current.tools.initProject({ projectType: "theme", name: "T", slug: "t" });
    });
    await act(async () => {
      await result.current.tools.generateRestEndpoint({
        namespace: "myapi/v1",
        route: "/items",
        methods: ["GET"],
      });
    });
    const fnFile = result.current.proj.files.find((f) => f.path === "functions.php");
    expect(fnFile?.content).toContain("register_rest_route");
    expect(fnFile?.content).toContain("rest_api_init");
  });
});

// ─── generateAcfBlock ────────────────────────────────────────────────────────

describe("generateAcfBlock", () => {
  it("registers ACF block and creates template file", async () => {
    const result = renderTools();
    await act(async () => {
      await result.current.tools.initProject({ projectType: "theme", name: "T", slug: "t" });
    });
    let out: Record<string, unknown> = {};
    await act(async () => {
      out = await result.current.tools.generateAcfBlock({
        blockName: "hero",
        title: "Hero Block",
        description: "A hero section",
      });
    });
    expect(out.success).toBe(true);
    expect(out.templatePath).toBe("template-parts/blocks/hero.php");

    const templateFile = result.current.proj.files.find(
      (f) => f.path === "template-parts/blocks/hero.php"
    );
    expect(templateFile).toBeDefined();
    expect(templateFile?.content).toContain("Hero Block");
  });
});

// ─── retrieveDocs ─────────────────────────────────────────────────────────────

describe("retrieveDocs", () => {
  it("returns a message without error", async () => {
    const result = renderTools();
    const out = await result.current.tools.retrieveDocs();
    expect(out.message).toBeDefined();
    expect(out.error).toBeUndefined();
  });
});
