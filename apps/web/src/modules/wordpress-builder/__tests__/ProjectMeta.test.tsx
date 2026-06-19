import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { ProjectMeta } from "../ProjectMeta";
import { makeEmptyWordPressProject } from "@ai-builder/serializers";
import type { WordPressProject } from "@ai-builder/schemas";

// ─── Fixtures ──────────────────────────────────────────────────────────────────

const themeProject: WordPressProject = {
  ...makeEmptyWordPressProject("theme"),
  name: "My Awesome Theme",
  slug: "my-awesome-theme",
  version: "2.0.0",
};

const pluginProject: WordPressProject = {
  ...makeEmptyWordPressProject("plugin"),
  name: "My Plugin",
  slug: "my-plugin",
  version: "1.5.0",
  files: [
    { id: "wpf_aa0001", path: "my-plugin.php", type: "php", content: "" },
    { id: "wpf_aa0002", path: "includes/class.php", type: "php", content: "" },
  ],
  acfGroups: [
    {
      id: "acfg_001",
      key: "group_hero",
      title: "Hero Fields",
      fields: [],
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
      supports: ["title"],
      public: true,
      hasArchive: false,
    },
  ],
};

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("ProjectMeta", () => {
  it("displays project name", () => {
    render(<ProjectMeta project={themeProject} />);
    expect(screen.getByText("My Awesome Theme")).toBeInTheDocument();
  });

  it("shows 'Theme' badge for theme project type", () => {
    render(<ProjectMeta project={themeProject} />);
    expect(screen.getByText("Theme")).toBeInTheDocument();
  });

  it("shows 'Plugin' badge for plugin project type", () => {
    render(<ProjectMeta project={pluginProject} />);
    expect(screen.getByText("Plugin")).toBeInTheDocument();
  });

  it("displays the slug in monospace", () => {
    render(<ProjectMeta project={themeProject} />);
    expect(screen.getByText("my-awesome-theme")).toBeInTheDocument();
  });

  it("displays version with v prefix", () => {
    render(<ProjectMeta project={themeProject} />);
    expect(screen.getByText("v2.0.0")).toBeInTheDocument();
  });

  it("shows file count", () => {
    render(<ProjectMeta project={pluginProject} />);
    expect(screen.getByText("2 files")).toBeInTheDocument();
  });

  it("shows ACF group count when groups exist", () => {
    render(<ProjectMeta project={pluginProject} />);
    expect(screen.getByText("1 ACF groups")).toBeInTheDocument();
  });

  it("shows CPT count when CPTs exist", () => {
    render(<ProjectMeta project={pluginProject} />);
    expect(screen.getByText("1 CPTs")).toBeInTheDocument();
  });

  it("does not show ACF count when zero groups", () => {
    render(<ProjectMeta project={themeProject} />);
    expect(screen.queryByText(/ACF groups/)).not.toBeInTheDocument();
  });

  it("does not show CPT count when zero CPTs", () => {
    render(<ProjectMeta project={themeProject} />);
    expect(screen.queryByText(/CPTs/)).not.toBeInTheDocument();
  });

  it("falls back to 'Untitled' when name is empty", () => {
    render(<ProjectMeta project={{ ...themeProject, name: "" }} />);
    expect(screen.getByText("Untitled")).toBeInTheDocument();
  });
});
