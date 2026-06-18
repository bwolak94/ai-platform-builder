import { describe, it, expect, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useStoryState } from "../hooks/useStoryState";
import { useStoryTools } from "../hooks/useStoryTools";

// ─── localStorage stub ─────────────────────────────────────────────────────────

const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, val: string) => {
      store[key] = val;
    },
    removeItem: (key: string) => {
      store = Object.fromEntries(Object.entries(store).filter(([k]) => k !== key));
    },
    clear: () => {
      store = {};
    },
  };
})();

Object.defineProperty(global, "localStorage", { value: localStorageMock, writable: true });

beforeEach(() => {
  localStorageMock.clear();
});

// ─── Subject hook ─────────────────────────────────────────────────────────────

function useSubject() {
  const state = useStoryState();
  const tools = useStoryTools(
    state.activeFile,
    state.setActiveFile,
    state.managerState,
    state.setManagerState
  );
  return { ...state, tools };
}

// ─── queryStory ───────────────────────────────────────────────────────────────

describe("queryStory", () => {
  it("returns dsl, fileCount, and activeFile", async () => {
    const { result } = renderHook(() => useSubject());
    const response = await result.current.tools.queryStory();
    expect(typeof response.dsl).toBe("string");
    expect(typeof response.fileCount).toBe("number");
    expect(typeof response.activeFile).toBe("string");
  });

  it("dsl contains component name", async () => {
    const { result } = renderHook(() => useSubject());
    const response = await result.current.tools.queryStory();
    expect(response.dsl).toContain("Button");
  });

  it("activeFile reflects the current component name", async () => {
    const { result } = renderHook(() => useSubject());
    await act(async () => {
      await result.current.tools.setComponent({
        componentName: "Card",
        componentPath: "src/components/Card.tsx",
      });
    });
    const response = await result.current.tools.queryStory();
    expect(response.activeFile).toBe("Card");
  });
});

// ─── setComponent ─────────────────────────────────────────────────────────────

describe("setComponent", () => {
  it("updates componentName", async () => {
    const { result } = renderHook(() => useSubject());
    await act(async () => {
      await result.current.tools.setComponent({
        componentName: "Modal",
        componentPath: "src/components/Modal.tsx",
      });
    });
    expect(result.current.activeFile.componentName).toBe("Modal");
  });

  it("updates componentPath", async () => {
    const { result } = renderHook(() => useSubject());
    await act(async () => {
      await result.current.tools.setComponent({
        componentName: "Modal",
        componentPath: "src/components/Modal.tsx",
      });
    });
    expect(result.current.activeFile.componentPath).toBe("src/components/Modal.tsx");
  });

  it("uses provided title when given", async () => {
    const { result } = renderHook(() => useSubject());
    await act(async () => {
      await result.current.tools.setComponent({
        componentName: "Modal",
        componentPath: "src/components/Modal.tsx",
        title: "Overlays/Modal",
      });
    });
    expect(result.current.activeFile.title).toBe("Overlays/Modal");
  });

  it("falls back to componentName as title when title is omitted", async () => {
    const { result } = renderHook(() => useSubject());
    await act(async () => {
      await result.current.tools.setComponent({
        componentName: "Badge",
        componentPath: "src/components/Badge.tsx",
      });
    });
    expect(result.current.activeFile.title).toBe("Badge");
  });

  it("returns success", async () => {
    const { result } = renderHook(() => useSubject());
    const response = await result.current.tools.setComponent({
      componentName: "X",
      componentPath: "x.tsx",
    });
    expect(response).toMatchObject({ success: true });
  });
});

// ─── addVariant ───────────────────────────────────────────────────────────────

describe("addVariant", () => {
  it("appends a variant", async () => {
    const { result } = renderHook(() => useSubject());
    const initialCount = result.current.activeFile.variants.length;
    await act(async () => {
      await result.current.tools.addVariant({
        name: "LargeText",
        args: { label: "Large" },
      });
    });
    expect(result.current.activeFile.variants).toHaveLength(initialCount + 1);
  });

  it("returns success with variantId", async () => {
    const { result } = renderHook(() => useSubject());
    let response: Record<string, unknown> | undefined;
    await act(async () => {
      response = await result.current.tools.addVariant({
        name: "Primary",
        args: { label: "Click" },
      });
    });
    expect(response).toMatchObject({ success: true, variantId: expect.stringMatching(/^var_/) });
  });

  it("sets viewport when provided", async () => {
    const { result } = renderHook(() => useSubject());
    await act(async () => {
      await result.current.tools.addVariant({
        name: "Mobile",
        args: {},
        viewport: "mobile1",
      });
    });
    const variant = result.current.activeFile.variants.find((v) => v.name === "Mobile");
    expect(variant?.viewport).toBe("mobile1");
  });
});

// ─── updateVariant ────────────────────────────────────────────────────────────

describe("updateVariant", () => {
  it("updates variant args by name", async () => {
    const { result } = renderHook(() => useSubject());
    await act(async () => {
      await result.current.tools.addVariant({ name: "Primary", args: { label: "Old" } });
      await result.current.tools.updateVariant({ name: "Primary", args: { label: "New" } });
    });
    const variant = result.current.activeFile.variants.find((v) => v.name === "Primary");
    expect(variant?.args).toEqual({ label: "New" });
  });

  it("updates docs", async () => {
    const { result } = renderHook(() => useSubject());
    await act(async () => {
      await result.current.tools.addVariant({ name: "Primary", args: {} });
      await result.current.tools.updateVariant({ name: "Primary", docs: "Primary button story" });
    });
    const variant = result.current.activeFile.variants.find((v) => v.name === "Primary");
    expect(variant?.docs).toBe("Primary button story");
  });

  it("is a no-op for unknown variant name", async () => {
    const { result } = renderHook(() => useSubject());
    const before = result.current.activeFile.variants.length;
    await act(async () => {
      await result.current.tools.updateVariant({ name: "NonExistent", args: {} });
    });
    expect(result.current.activeFile.variants).toHaveLength(before);
  });
});

// ─── removeVariant ────────────────────────────────────────────────────────────

describe("removeVariant", () => {
  it("removes a variant by name", async () => {
    const { result } = renderHook(() => useSubject());
    await act(async () => {
      await result.current.tools.addVariant({ name: "ToRemove", args: {} });
      await result.current.tools.removeVariant({ name: "ToRemove" });
    });
    const removed = result.current.activeFile.variants.find((v) => v.name === "ToRemove");
    expect(removed).toBeUndefined();
  });

  it("does not remove other variants", async () => {
    const { result } = renderHook(() => useSubject());
    await act(async () => {
      await result.current.tools.addVariant({ name: "Keep", args: {} });
      await result.current.tools.addVariant({ name: "Remove", args: {} });
      await result.current.tools.removeVariant({ name: "Remove" });
    });
    const kept = result.current.activeFile.variants.find((v) => v.name === "Keep");
    expect(kept).toBeDefined();
  });
});

// ─── setLayout ────────────────────────────────────────────────────────────────

describe("setLayout", () => {
  it("updates layout to fullscreen", async () => {
    const { result } = renderHook(() => useSubject());
    await act(async () => {
      await result.current.tools.setLayout({ layout: "fullscreen" });
    });
    expect(result.current.activeFile.layout).toBe("fullscreen");
  });

  it("returns success", async () => {
    const { result } = renderHook(() => useSubject());
    const response = await result.current.tools.setLayout({ layout: "padded" });
    expect(response).toMatchObject({ success: true });
  });
});

// ─── addArgType ───────────────────────────────────────────────────────────────

describe("addArgType", () => {
  it("appends an argType to the file", async () => {
    const { result } = renderHook(() => useSubject());
    const initialCount = result.current.activeFile.argTypes?.length ?? 0;
    await act(async () => {
      await result.current.tools.addArgType({
        argType: {
          name: "variant",
          control: { type: "select", options: ["primary", "secondary"] },
          defaultValue: "primary",
          description: "Visual style",
        },
      });
    });
    const argTypes = result.current.activeFile.argTypes ?? [];
    expect(argTypes).toHaveLength(initialCount + 1);
    expect(argTypes.find((a) => a.name === "variant")).toBeDefined();
  });

  it("returns success", async () => {
    const { result } = renderHook(() => useSubject());
    const response = await result.current.tools.addArgType({
      argType: { name: "size", control: { type: "select" } },
    });
    expect(response).toMatchObject({ success: true });
  });
});

// ─── addTag ───────────────────────────────────────────────────────────────────

describe("addTag", () => {
  it("adds a tag", async () => {
    const { result } = renderHook(() => useSubject());
    await act(async () => {
      await result.current.tools.addTag({ tag: "autodocs" });
    });
    expect(result.current.activeFile.tags).toContain("autodocs");
  });

  it("does not add duplicate tags", async () => {
    const { result } = renderHook(() => useSubject());
    await act(async () => {
      await result.current.tools.addTag({ tag: "autodocs" });
      await result.current.tools.addTag({ tag: "autodocs" });
    });
    expect(result.current.activeFile.tags?.filter((t) => t === "autodocs")).toHaveLength(1);
  });
});

// ─── addDecorator ─────────────────────────────────────────────────────────────

describe("addDecorator", () => {
  it("appends a decorator string", async () => {
    const { result } = renderHook(() => useSubject());
    await act(async () => {
      await result.current.tools.addDecorator({ decorator: "(Story) => <Story />" });
    });
    expect(result.current.activeFile.decorators).toContain("(Story) => <Story />");
  });
});

// ─── createStoryFile ──────────────────────────────────────────────────────────

describe("createStoryFile", () => {
  it("adds a new story file", async () => {
    const { result } = renderHook(() => useSubject());
    await act(async () => {
      await result.current.tools.createStoryFile({
        componentName: "Input",
        componentPath: "src/components/Input.tsx",
      });
    });
    expect(result.current.managerState.files).toHaveLength(2);
  });

  it("switches active file to the new file", async () => {
    const { result } = renderHook(() => useSubject());
    await act(async () => {
      await result.current.tools.createStoryFile({
        componentName: "Input",
        componentPath: "src/components/Input.tsx",
      });
    });
    const activeId = result.current.managerState.activeFileId;
    const activeFile = result.current.managerState.files.find((f) => f.id === activeId);
    expect(activeFile?.componentName).toBe("Input");
  });

  it("returns success with fileId", async () => {
    const { result } = renderHook(() => useSubject());
    let response: Record<string, unknown> | undefined;
    await act(async () => {
      response = await result.current.tools.createStoryFile({
        componentName: "Input",
        componentPath: "src/components/Input.tsx",
      });
    });
    expect(response).toMatchObject({ success: true, fileId: expect.any(String) });
  });
});

// ─── switchStoryFile ──────────────────────────────────────────────────────────

describe("switchStoryFile", () => {
  it("switches to a file by componentName", async () => {
    const { result } = renderHook(() => useSubject());
    const originalName = result.current.activeFile.componentName;
    await act(async () => {
      await result.current.tools.createStoryFile({
        componentName: "Input",
        componentPath: "src/components/Input.tsx",
      });
      await result.current.tools.switchStoryFile({ componentName: originalName });
    });
    expect(result.current.activeFile.componentName).toBe(originalName);
  });

  it("returns error for unknown componentName", async () => {
    const { result } = renderHook(() => useSubject());
    const response = await result.current.tools.switchStoryFile({ componentName: "Ghost" });
    expect(response).toMatchObject({ error: expect.any(String) });
  });
});

// ─── addResponsiveStory ───────────────────────────────────────────────────────

describe("addResponsiveStory", () => {
  it("adds 3 viewport variants based on the base variant", async () => {
    const { result } = renderHook(() => useSubject());
    const baseVariantName = result.current.activeFile.variants[0]?.name ?? "Default";
    const initialCount = result.current.activeFile.variants.length;
    await act(async () => {
      await result.current.tools.addResponsiveStory({ baseVariantName });
    });
    expect(result.current.activeFile.variants).toHaveLength(initialCount + 3);
  });

  it("created variants have different viewports", async () => {
    const { result } = renderHook(() => useSubject());
    const baseVariantName = result.current.activeFile.variants[0]?.name ?? "Default";
    const initialCount = result.current.activeFile.variants.length;
    await act(async () => {
      await result.current.tools.addResponsiveStory({ baseVariantName });
    });
    const newVariants = result.current.activeFile.variants.slice(initialCount);
    const viewports = newVariants.map((v) => v.viewport);
    expect(new Set(viewports).size).toBe(3);
  });

  it("is a no-op for unknown base variant name", async () => {
    const { result } = renderHook(() => useSubject());
    const initialCount = result.current.activeFile.variants.length;
    await act(async () => {
      await result.current.tools.addResponsiveStory({ baseVariantName: "NonExistent" });
    });
    expect(result.current.activeFile.variants).toHaveLength(initialCount);
  });
});

// ─── generateSnapshotTest ────────────────────────────────────────────────────

describe("generateSnapshotTest", () => {
  it("returns success with dsl string", async () => {
    const { result } = renderHook(() => useSubject());
    const response = await result.current.tools.generateSnapshotTest();
    expect(response).toMatchObject({ success: true });
    expect(typeof response.dsl).toBe("string");
  });
});

// ─── exportToMDX ─────────────────────────────────────────────────────────────

describe("exportToMDX", () => {
  it("returns success with dsl string", async () => {
    const { result } = renderHook(() => useSubject());
    const response = await result.current.tools.exportToMDX();
    expect(response).toMatchObject({ success: true });
    expect(typeof response.dsl).toBe("string");
  });
});

// ─── addMSWDecorator ─────────────────────────────────────────────────────────

describe("addMSWDecorator", () => {
  it("adds a global decorator when variantName is null", async () => {
    const { result } = renderHook(() => useSubject());
    const initialDecoratorCount = result.current.activeFile.decorators?.length ?? 0;
    await act(async () => {
      await result.current.tools.addMSWDecorator({
        variantName: null,
        handlers: [{ method: "GET", url: "/api/users", status: 200, response: { data: [] } }],
      });
    });
    expect(result.current.activeFile.decorators?.length ?? 0).toBe(initialDecoratorCount + 1);
  });

  it("adds MSW handler to variant parameters when variantName is provided", async () => {
    const { result } = renderHook(() => useSubject());
    const variantName = result.current.activeFile.variants[0]?.name ?? "Default";
    await act(async () => {
      await result.current.tools.addMSWDecorator({
        variantName,
        handlers: [{ method: "GET", url: "/api/posts", status: 200, response: {} }],
      });
    });
    const variant = result.current.activeFile.variants.find((v) => v.name === variantName);
    expect(variant?.parameters).toBeDefined();
  });
});

// ─── passthrough tools ────────────────────────────────────────────────────────

describe("passthrough tools", () => {
  it("addPlayFunction returns success", async () => {
    const { result } = renderHook(() => useSubject());
    const response = await result.current.tools.addPlayFunction({
      variantName: "Default",
      steps: [{ description: "click button", code: "await userEvent.click(button)" }],
    });
    expect(response).toMatchObject({ success: true });
  });

  it("inferStoriesFromInterface returns success", async () => {
    const { result } = renderHook(() => useSubject());
    const response = await result.current.tools.inferStoriesFromInterface({
      interfaceSource: "interface ButtonProps { label: string; }",
    });
    expect(response).toMatchObject({ success: true });
  });

  it("generateDesignTokenStory returns success", async () => {
    const { result } = renderHook(() => useSubject());
    const response = await result.current.tools.generateDesignTokenStory({ title: "Colors" });
    expect(response).toMatchObject({ success: true });
  });

  it("generateA11yTests returns success", async () => {
    const { result } = renderHook(() => useSubject());
    const response = await result.current.tools.generateA11yTests({ variantName: "Default" });
    expect(response).toMatchObject({ success: true });
  });

  it("addChromatiConfig returns success", async () => {
    const { result } = renderHook(() => useSubject());
    const response = await result.current.tools.addChromatiConfig({
      viewports: [320, 1280],
      diffThreshold: 0.063,
    });
    expect(response).toMatchObject({ success: true });
  });

  it("generateInteractionTest returns success", async () => {
    const { result } = renderHook(() => useSubject());
    const response = await result.current.tools.generateInteractionTest({
      variantName: "Default",
      interactions: ["click button"],
    });
    expect(response).toMatchObject({ success: true });
  });
});
