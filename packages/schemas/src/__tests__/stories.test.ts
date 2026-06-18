import { describe, it, expect } from "vitest";
import {
  StoryVariantSchema,
  StoryFileSchema,
  StoryManagerStateSchema,
  ArgTypeSchema,
} from "../stories";

const validVariant = {
  id: "var_001",
  name: "Default",
  args: { label: "Click me", variant: "primary" },
  viewport: null,
  docs: null,
  parameters: null,
};

const validFile = {
  id: "story_001",
  componentName: "Button",
  componentPath: "src/components/Button.tsx",
  title: "Components/Button",
  layout: "centered" as const,
  defaultArgs: { label: "Click me" },
  argTypes: null,
  variants: [validVariant],
  tags: null,
  decorators: null,
};

describe("ArgTypeSchema", () => {
  it("accepts a valid argType", () => {
    const result = ArgTypeSchema.safeParse({
      name: "variant",
      control: "select",
      options: ["primary", "secondary"],
      defaultValue: "primary",
      description: "Button variant",
    });
    expect(result.success).toBe(true);
  });

  it("rejects an invalid control type", () => {
    const result = ArgTypeSchema.safeParse({
      name: "x",
      control: "slider",
      options: null,
      defaultValue: null,
      description: null,
    });
    expect(result.success).toBe(false);
  });

  it("accepts null options and description", () => {
    const result = ArgTypeSchema.safeParse({
      name: "disabled",
      control: "boolean",
      options: null,
      defaultValue: null,
      description: null,
    });
    expect(result.success).toBe(true);
  });
});

describe("StoryVariantSchema", () => {
  it("accepts a valid variant", () => {
    expect(StoryVariantSchema.safeParse(validVariant).success).toBe(true);
  });

  it("rejects an empty name", () => {
    const result = StoryVariantSchema.safeParse({ ...validVariant, name: "" });
    expect(result.success).toBe(false);
  });

  it("accepts all viewport values", () => {
    for (const viewport of ["mobile1", "mobile2", "tablet", "desktop"] as const) {
      const result = StoryVariantSchema.safeParse({ ...validVariant, viewport });
      expect(result.success).toBe(true);
    }
  });

  it("accepts a null viewport", () => {
    const result = StoryVariantSchema.safeParse({ ...validVariant, viewport: null });
    expect(result.success).toBe(true);
  });

  it("accepts parameters as a record", () => {
    const result = StoryVariantSchema.safeParse({
      ...validVariant,
      parameters: { backgrounds: { default: "dark" } },
    });
    expect(result.success).toBe(true);
  });
});

describe("StoryFileSchema", () => {
  it("accepts a valid story file", () => {
    expect(StoryFileSchema.safeParse(validFile).success).toBe(true);
  });

  it("rejects a non-PascalCase component name", () => {
    const result = StoryFileSchema.safeParse({ ...validFile, componentName: "button" });
    expect(result.success).toBe(false);
  });

  it("rejects a component name starting with a number", () => {
    const result = StoryFileSchema.safeParse({ ...validFile, componentName: "1Button" });
    expect(result.success).toBe(false);
  });

  it("accepts all layout values", () => {
    for (const layout of ["centered", "fullscreen", "padded"] as const) {
      const result = StoryFileSchema.safeParse({ ...validFile, layout });
      expect(result.success).toBe(true);
    }
  });

  it("accepts multiple variants", () => {
    const result = StoryFileSchema.safeParse({
      ...validFile,
      variants: [
        validVariant,
        { ...validVariant, id: "var_002", name: "Disabled", args: { disabled: true } },
      ],
    });
    expect(result.success).toBe(true);
  });

  it("accepts tags and decorators", () => {
    const result = StoryFileSchema.safeParse({
      ...validFile,
      tags: ["autodocs"],
      decorators: ["(Story) => <ThemeProvider><Story /></ThemeProvider>"],
    });
    expect(result.success).toBe(true);
  });
});

describe("StoryManagerStateSchema", () => {
  it("accepts a valid manager state", () => {
    const result = StoryManagerStateSchema.safeParse({
      files: [validFile],
      activeFileId: "story_001",
    });
    expect(result.success).toBe(true);
  });

  it("rejects an empty files array", () => {
    const result = StoryManagerStateSchema.safeParse({ files: [], activeFileId: "story_001" });
    expect(result.success).toBe(false);
  });
});
