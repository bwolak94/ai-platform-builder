import { describe, it, expect } from "vitest";
import { serializeStoriesDSL, deserializeStoriesDSL, generateStoriesCode } from "../stories-dsl";
import type { StoryFile } from "@ai-builder/schemas";

const baseFile: StoryFile = {
  id: "story_001",
  componentName: "Button",
  componentPath: "src/components/Button.tsx",
  title: "Components/Button",
  layout: "centered",
  defaultArgs: { label: "Click me", variant: "primary" },
  argTypes: [
    {
      name: "variant",
      control: "select",
      options: ["primary", "secondary", "ghost"],
      defaultValue: "primary",
      description: "Visual style of the button",
    },
    {
      name: "disabled",
      control: "boolean",
      options: null,
      defaultValue: null,
      description: null,
    },
  ],
  variants: [
    {
      id: "var_001",
      name: "Primary",
      args: { label: "Click me", variant: "primary" },
      viewport: null,
      docs: "Default primary button",
      parameters: null,
    },
    {
      id: "var_002",
      name: "Disabled",
      args: { label: "Click me", disabled: true },
      viewport: null,
      docs: null,
      parameters: null,
    },
    {
      id: "var_003",
      name: "Mobile",
      args: { label: "Click me" },
      viewport: "mobile1",
      docs: null,
      parameters: null,
    },
  ],
  tags: ["autodocs"],
  decorators: null,
};

describe("serializeStoriesDSL", () => {
  it("includes the component name", () => {
    const dsl = serializeStoriesDSL(baseFile);
    expect(dsl).toContain("Button");
  });

  it("includes the component path", () => {
    const dsl = serializeStoriesDSL(baseFile);
    expect(dsl).toContain("src/components/Button.tsx");
  });

  it("includes all variant names", () => {
    const dsl = serializeStoriesDSL(baseFile);
    expect(dsl).toContain("Primary");
    expect(dsl).toContain("Disabled");
    expect(dsl).toContain("Mobile");
  });

  it("includes layout", () => {
    const dsl = serializeStoriesDSL(baseFile);
    expect(dsl).toContain("centered");
  });

  it("includes tags", () => {
    const dsl = serializeStoriesDSL(baseFile);
    expect(dsl).toContain("autodocs");
  });

  it("includes argType names", () => {
    const dsl = serializeStoriesDSL(baseFile);
    expect(dsl).toContain("variant");
    expect(dsl).toContain("disabled");
  });
});

describe("deserializeStoriesDSL", () => {
  it("round-trips the component name", () => {
    const dsl = serializeStoriesDSL(baseFile);
    const restored = deserializeStoriesDSL(dsl);
    expect(restored.componentName).toBe("Button");
  });

  it("round-trips the component path", () => {
    const dsl = serializeStoriesDSL(baseFile);
    const restored = deserializeStoriesDSL(dsl);
    expect(restored.componentPath).toBe("src/components/Button.tsx");
  });

  it("round-trips variant count", () => {
    const dsl = serializeStoriesDSL(baseFile);
    const restored = deserializeStoriesDSL(dsl);
    expect(restored.variants).toHaveLength(3);
  });

  it("round-trips variant names", () => {
    const dsl = serializeStoriesDSL(baseFile);
    const restored = deserializeStoriesDSL(dsl);
    const names = restored.variants.map((v) => v.name);
    expect(names).toContain("Primary");
    expect(names).toContain("Disabled");
  });

  it("round-trips viewport on Mobile variant", () => {
    const dsl = serializeStoriesDSL(baseFile);
    const restored = deserializeStoriesDSL(dsl);
    const mobile = restored.variants.find((v) => v.name === "Mobile");
    expect(mobile?.viewport).toBe("mobile1");
  });
});

describe("generateStoriesCode", () => {
  it("produces valid TypeScript/TSX with CSF3 format", () => {
    const code = generateStoriesCode(baseFile);
    expect(code).toContain("import");
    expect(code).toContain("Button");
  });

  it("includes a Meta export", () => {
    const code = generateStoriesCode(baseFile);
    expect(code).toContain("Meta");
  });

  it("includes named exports for each variant", () => {
    const code = generateStoriesCode(baseFile);
    expect(code).toContain("Primary");
    expect(code).toContain("Disabled");
  });

  it("includes args for each variant", () => {
    const code = generateStoriesCode(baseFile);
    expect(code).toContain("args");
  });
});
