import { describe, it, expect, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useE2eState } from "../hooks/useE2eState";
import { useE2eTools } from "../hooks/useE2eTools";
import type { TestCase, TestFile, TestStep } from "@ai-builder/schemas";

// ─── localStorage stub ────────────────────────────────────────────────────────

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

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const navigateStep: TestStep = { action: "navigate", id: "step_nav001", path: "/login" };
const clickStep: TestStep = {
  action: "click",
  id: "step_clk001",
  selector: { strategy: "role", value: "button", name: "Submit" },
};
const fillStep: TestStep = {
  action: "fill",
  id: "step_fil001",
  selector: { strategy: "label", value: "Email", name: null },
  value: "user@example.com",
};
const expectStep: TestStep = {
  action: "expect",
  id: "step_exp001",
  type: "url",
  selector: null,
  value: "/dashboard",
  attribute: null,
};

const validTestCase = {
  id: "tc_abc123",
  name: "User can log in",
  tags: ["smoke"],
  beforeEach: null,
  steps: [navigateStep, fillStep, clickStep, expectStep],
};

function useSubject() {
  const state = useE2eState();
  const tools = useE2eTools(
    state.activeFile,
    state.setActiveFile,
    state.managerState,
    state.setManagerState
  );
  return { ...state, tools };
}

// ─── querySpec ────────────────────────────────────────────────────────────────

describe("querySpec", () => {
  it("returns a dsl string", async () => {
    const { result } = renderHook(() => useSubject());
    const response = await result.current.tools.querySpec();
    expect(typeof response.dsl).toBe("string");
    expect(response.dsl.length).toBeGreaterThan(0);
  });

  it("dsl contains filename", async () => {
    const { result } = renderHook(() => useSubject());
    const response = await result.current.tools.querySpec();
    expect(response.dsl).toContain("app.spec.ts");
  });

  it("dsl reflects test cases after add", async () => {
    const { result } = renderHook(() => useSubject());
    await act(async () => {
      await result.current.tools.addTestCase(validTestCase);
    });
    const response = await result.current.tools.querySpec();
    expect(response.dsl).toContain("User can log in");
  });
});

// ─── setFileInfo ──────────────────────────────────────────────────────────────

describe("setFileInfo", () => {
  it("updates filename", async () => {
    const { result } = renderHook(() => useSubject());
    await act(async () => {
      await result.current.tools.setFileInfo({ filename: "auth.spec.ts" });
    });
    expect(result.current.activeFile.filename).toBe("auth.spec.ts");
  });

  it("updates baseUrl", async () => {
    const { result } = renderHook(() => useSubject());
    await act(async () => {
      await result.current.tools.setFileInfo({ baseUrl: "https://staging.example.com" });
    });
    expect(result.current.activeFile.baseUrl).toBe("https://staging.example.com");
  });

  it("updates description to null", async () => {
    const { result } = renderHook(() => useSubject());
    await act(async () => {
      await result.current.tools.setFileInfo({ description: "My tests" });
    });
    await act(async () => {
      await result.current.tools.setFileInfo({ description: null });
    });
    expect(result.current.activeFile.description).toBeNull();
  });

  it("does not overwrite omitted fields", async () => {
    const { result } = renderHook(() => useSubject());
    const originalBaseUrl = result.current.activeFile.baseUrl;
    await act(async () => {
      await result.current.tools.setFileInfo({ filename: "renamed.spec.ts" });
    });
    expect(result.current.activeFile.baseUrl).toBe(originalBaseUrl);
  });

  it("returns success", async () => {
    const { result } = renderHook(() => useSubject());
    const response = await result.current.tools.setFileInfo({ filename: "test.spec.ts" });
    expect(response).toMatchObject({ success: true });
  });
});

// ─── addTestCase ──────────────────────────────────────────────────────────────

describe("addTestCase", () => {
  it("appends a valid test case", async () => {
    const { result } = renderHook(() => useSubject());
    await act(async () => {
      await result.current.tools.addTestCase(validTestCase);
    });
    expect(result.current.activeFile.testCases).toHaveLength(1);
    expect(result.current.activeFile.testCases[0]?.id).toBe("tc_abc123");
  });

  it("returns success with testCaseId", async () => {
    const { result } = renderHook(() => useSubject());
    let response: Record<string, unknown> | undefined;
    await act(async () => {
      response = await result.current.tools.addTestCase(validTestCase);
    });
    expect(response).toMatchObject({ success: true, testCaseId: "tc_abc123" });
  });

  it("returns error for invalid shape", async () => {
    const { result } = renderHook(() => useSubject());
    const response = await result.current.tools.addTestCase({ id: "bad" });
    expect(response).toMatchObject({ error: expect.any(String) });
    expect(result.current.activeFile.testCases).toHaveLength(0);
  });

  it("adds multiple test cases in order", async () => {
    const { result } = renderHook(() => useSubject());
    await act(async () => {
      await result.current.tools.addTestCase(validTestCase);
      await result.current.tools.addTestCase({ ...validTestCase, id: "tc_def456", name: "Second" });
    });
    expect(result.current.activeFile.testCases).toHaveLength(2);
    expect(result.current.activeFile.testCases[1]?.id).toBe("tc_def456");
  });
});

// ─── updateTestCase ───────────────────────────────────────────────────────────

describe("updateTestCase", () => {
  it("updates test case name", async () => {
    const { result } = renderHook(() => useSubject());
    await act(async () => {
      await result.current.tools.addTestCase(validTestCase);
      await result.current.tools.updateTestCase({ testCaseId: "tc_abc123", name: "Renamed test" });
    });
    expect(result.current.activeFile.testCases[0]?.name).toBe("Renamed test");
  });

  it("updates tags", async () => {
    const { result } = renderHook(() => useSubject());
    await act(async () => {
      await result.current.tools.addTestCase(validTestCase);
      await result.current.tools.updateTestCase({ testCaseId: "tc_abc123", tags: ["regression"] });
    });
    expect(result.current.activeFile.testCases[0]?.tags).toEqual(["regression"]);
  });

  it("sets tags to null", async () => {
    const { result } = renderHook(() => useSubject());
    await act(async () => {
      await result.current.tools.addTestCase(validTestCase);
      await result.current.tools.updateTestCase({ testCaseId: "tc_abc123", tags: null });
    });
    expect(result.current.activeFile.testCases[0]?.tags).toBeNull();
  });

  it("does not modify other test cases", async () => {
    const { result } = renderHook(() => useSubject());
    await act(async () => {
      await result.current.tools.addTestCase(validTestCase);
      await result.current.tools.addTestCase({ ...validTestCase, id: "tc_def456", name: "Other" });
      await result.current.tools.updateTestCase({ testCaseId: "tc_abc123", name: "Updated" });
    });
    expect(result.current.activeFile.testCases[1]?.name).toBe("Other");
  });

  it("is a no-op for unknown testCaseId", async () => {
    const { result } = renderHook(() => useSubject());
    await act(async () => {
      await result.current.tools.addTestCase(validTestCase);
      await result.current.tools.updateTestCase({ testCaseId: "not_exist", name: "Ghost" });
    });
    expect(result.current.activeFile.testCases[0]?.name).toBe("User can log in");
  });
});

// ─── removeTestCase ───────────────────────────────────────────────────────────

describe("removeTestCase", () => {
  it("removes the test case by id", async () => {
    const { result } = renderHook(() => useSubject());
    await act(async () => {
      await result.current.tools.addTestCase(validTestCase);
      await result.current.tools.removeTestCase({ testCaseId: "tc_abc123" });
    });
    expect(result.current.activeFile.testCases).toHaveLength(0);
  });

  it("removes only the targeted test case", async () => {
    const { result } = renderHook(() => useSubject());
    await act(async () => {
      await result.current.tools.addTestCase(validTestCase);
      await result.current.tools.addTestCase({ ...validTestCase, id: "tc_def456", name: "Other" });
      await result.current.tools.removeTestCase({ testCaseId: "tc_abc123" });
    });
    expect(result.current.activeFile.testCases).toHaveLength(1);
    expect(result.current.activeFile.testCases[0]?.id).toBe("tc_def456");
  });
});

// ─── duplicateTestCase ────────────────────────────────────────────────────────

describe("duplicateTestCase", () => {
  it("appends a copy with a new id", async () => {
    const { result } = renderHook(() => useSubject());
    await act(async () => {
      await result.current.tools.addTestCase(validTestCase);
      await result.current.tools.duplicateTestCase({
        testCaseId: "tc_abc123",
        newId: "tc_copy001",
      });
    });
    expect(result.current.activeFile.testCases).toHaveLength(2);
    expect(result.current.activeFile.testCases[1]?.id).toBe("tc_copy001");
  });

  it("copies steps with new ids", async () => {
    const { result } = renderHook(() => useSubject());
    await act(async () => {
      await result.current.tools.addTestCase(validTestCase);
      await result.current.tools.duplicateTestCase({
        testCaseId: "tc_abc123",
        newId: "tc_copy001",
      });
    });
    const original = result.current.activeFile.testCases[0] as TestCase;
    const copy = result.current.activeFile.testCases[1] as TestCase;
    expect(copy.steps).toHaveLength(original.steps.length);
    copy.steps.forEach((s, i) => {
      expect(s.id).not.toBe(original.steps[i]?.id);
    });
  });

  it("uses newName when provided", async () => {
    const { result } = renderHook(() => useSubject());
    await act(async () => {
      await result.current.tools.addTestCase(validTestCase);
      await result.current.tools.duplicateTestCase({
        testCaseId: "tc_abc123",
        newId: "tc_copy001",
        newName: "Custom copy name",
      });
    });
    expect(result.current.activeFile.testCases[1]?.name).toBe("Custom copy name");
  });

  it("appends (copy) suffix to name when newName is omitted", async () => {
    const { result } = renderHook(() => useSubject());
    await act(async () => {
      await result.current.tools.addTestCase(validTestCase);
      await result.current.tools.duplicateTestCase({
        testCaseId: "tc_abc123",
        newId: "tc_copy001",
      });
    });
    expect(result.current.activeFile.testCases[1]?.name).toContain("copy");
  });

  it("is a no-op for unknown testCaseId", async () => {
    const { result } = renderHook(() => useSubject());
    await act(async () => {
      await result.current.tools.addTestCase(validTestCase);
      await result.current.tools.duplicateTestCase({ testCaseId: "ghost", newId: "tc_copy001" });
    });
    expect(result.current.activeFile.testCases).toHaveLength(1);
  });
});

// ─── addStep ──────────────────────────────────────────────────────────────────

describe("addStep", () => {
  it("appends a valid step to a test case", async () => {
    const { result } = renderHook(() => useSubject());
    await act(async () => {
      await result.current.tools.addTestCase(validTestCase);
      await result.current.tools.addStep({ testCaseId: "tc_abc123", step: navigateStep });
    });
    const tc = result.current.activeFile.testCases[0] as TestCase;
    expect(tc.steps).toHaveLength(validTestCase.steps.length + 1);
  });

  it("returns error for invalid step shape", async () => {
    const { result } = renderHook(() => useSubject());
    await act(async () => {
      await result.current.tools.addTestCase(validTestCase);
    });
    const response = await result.current.tools.addStep({
      testCaseId: "tc_abc123",
      step: { action: "unknown" },
    });
    expect(response).toMatchObject({ error: expect.any(String) });
  });

  it("does not modify other test cases", async () => {
    const { result } = renderHook(() => useSubject());
    await act(async () => {
      await result.current.tools.addTestCase(validTestCase);
      await result.current.tools.addTestCase({
        ...validTestCase,
        id: "tc_other",
        name: "Other",
        steps: [],
      });
      await result.current.tools.addStep({ testCaseId: "tc_abc123", step: navigateStep });
    });
    const otherTc = result.current.activeFile.testCases.find((t) => t.id === "tc_other");
    expect(otherTc?.steps).toHaveLength(0);
  });
});

// ─── updateStep ───────────────────────────────────────────────────────────────

describe("updateStep", () => {
  it("replaces a step by id", async () => {
    const { result } = renderHook(() => useSubject());
    await act(async () => {
      await result.current.tools.addTestCase(validTestCase);
    });
    const originalStepId = (
      (result.current.activeFile.testCases[0] as TestCase).steps[0] as TestStep
    ).id;
    const replacement: TestStep = { action: "navigate", id: originalStepId, path: "/changed" };

    await act(async () => {
      await result.current.tools.updateStep({
        testCaseId: "tc_abc123",
        stepId: originalStepId,
        step: replacement,
      });
    });

    const updated = (result.current.activeFile.testCases[0] as TestCase).steps[0] as TestStep;
    expect(updated.action).toBe("navigate");
    if (updated.action === "navigate") expect(updated.path).toBe("/changed");
  });

  it("returns error for invalid step", async () => {
    const { result } = renderHook(() => useSubject());
    await act(async () => {
      await result.current.tools.addTestCase(validTestCase);
    });
    const response = await result.current.tools.updateStep({
      testCaseId: "tc_abc123",
      stepId: "step_nav001",
      step: { action: "bad" },
    });
    expect(response).toMatchObject({ error: expect.any(String) });
  });
});

// ─── removeStep ───────────────────────────────────────────────────────────────

describe("removeStep", () => {
  it("removes a step by id", async () => {
    const { result } = renderHook(() => useSubject());
    await act(async () => {
      await result.current.tools.addTestCase(validTestCase);
    });
    const stepId = ((result.current.activeFile.testCases[0] as TestCase).steps[0] as TestStep).id;

    await act(async () => {
      await result.current.tools.removeStep({ testCaseId: "tc_abc123", stepId });
    });

    expect((result.current.activeFile.testCases[0] as TestCase).steps).toHaveLength(
      validTestCase.steps.length - 1
    );
  });

  it("is a no-op for unknown stepId", async () => {
    const { result } = renderHook(() => useSubject());
    await act(async () => {
      await result.current.tools.addTestCase(validTestCase);
      await result.current.tools.removeStep({ testCaseId: "tc_abc123", stepId: "ghost" });
    });
    expect((result.current.activeFile.testCases[0] as TestCase).steps).toHaveLength(
      validTestCase.steps.length
    );
  });
});

// ─── reorderSteps ─────────────────────────────────────────────────────────────

describe("reorderSteps", () => {
  it("reorders steps by provided id array", async () => {
    const { result } = renderHook(() => useSubject());
    await act(async () => {
      await result.current.tools.addTestCase(validTestCase);
    });
    const steps = (result.current.activeFile.testCases[0] as TestCase).steps;
    const reversedIds = [...steps].reverse().map((s) => s.id);

    await act(async () => {
      await result.current.tools.reorderSteps({
        testCaseId: "tc_abc123",
        orderedStepIds: reversedIds,
      });
    });

    const reordered = (result.current.activeFile.testCases[0] as TestCase).steps;
    expect(reordered[0]?.id).toBe(reversedIds[0]);
    expect(reordered[reordered.length - 1]?.id).toBe(reversedIds[reversedIds.length - 1]);
  });

  it("excludes unknown step ids", async () => {
    const { result } = renderHook(() => useSubject());
    await act(async () => {
      await result.current.tools.addTestCase(validTestCase);
    });
    const ids = (result.current.activeFile.testCases[0] as TestCase).steps.map((s) => s.id);

    await act(async () => {
      await result.current.tools.reorderSteps({
        testCaseId: "tc_abc123",
        orderedStepIds: ["ghost_id", ...ids],
      });
    });

    expect((result.current.activeFile.testCases[0] as TestCase).steps).toHaveLength(ids.length);
  });
});

// ─── addBeforeEachStep ────────────────────────────────────────────────────────

describe("addBeforeEachStep", () => {
  it("adds a step to beforeEach (starting from null)", async () => {
    const { result } = renderHook(() => useSubject());
    await act(async () => {
      await result.current.tools.addTestCase({ ...validTestCase, beforeEach: null });
      await result.current.tools.addBeforeEachStep({
        testCaseId: "tc_abc123",
        step: navigateStep,
      });
    });
    expect(result.current.activeFile.testCases[0]?.beforeEach).toHaveLength(1);
  });

  it("appends to existing beforeEach steps", async () => {
    const { result } = renderHook(() => useSubject());
    await act(async () => {
      await result.current.tools.addTestCase({ ...validTestCase, beforeEach: [navigateStep] });
      await result.current.tools.addBeforeEachStep({ testCaseId: "tc_abc123", step: fillStep });
    });
    expect(result.current.activeFile.testCases[0]?.beforeEach).toHaveLength(2);
  });

  it("returns error for invalid step", async () => {
    const { result } = renderHook(() => useSubject());
    await act(async () => {
      await result.current.tools.addTestCase(validTestCase);
    });
    const response = await result.current.tools.addBeforeEachStep({
      testCaseId: "tc_abc123",
      step: { invalid: true },
    });
    expect(response).toMatchObject({ error: expect.any(String) });
  });
});

// ─── reorderTestCases ─────────────────────────────────────────────────────────

describe("reorderTestCases", () => {
  it("reorders test cases by provided id array", async () => {
    const { result } = renderHook(() => useSubject());
    await act(async () => {
      await result.current.tools.addTestCase(validTestCase);
      await result.current.tools.addTestCase({ ...validTestCase, id: "tc_def456", name: "Second" });
      await result.current.tools.reorderTestCases({ orderedIds: ["tc_def456", "tc_abc123"] });
    });
    expect(result.current.activeFile.testCases[0]?.id).toBe("tc_def456");
    expect(result.current.activeFile.testCases[1]?.id).toBe("tc_abc123");
  });

  it("excludes unknown ids", async () => {
    const { result } = renderHook(() => useSubject());
    await act(async () => {
      await result.current.tools.addTestCase(validTestCase);
      await result.current.tools.reorderTestCases({ orderedIds: ["ghost", "tc_abc123"] });
    });
    expect(result.current.activeFile.testCases).toHaveLength(1);
  });
});

// ─── createTestFile ───────────────────────────────────────────────────────────

describe("createTestFile", () => {
  it("adds a new file to the manager state", async () => {
    const { result } = renderHook(() => useSubject());
    await act(async () => {
      await result.current.tools.createTestFile({
        id: "e2e_new001",
        filename: "checkout.spec.ts",
        baseUrl: "http://localhost:3000",
      });
    });
    expect(result.current.managerState.files).toHaveLength(2);
  });

  it("switches active file to the new file", async () => {
    const { result } = renderHook(() => useSubject());
    await act(async () => {
      await result.current.tools.createTestFile({
        id: "e2e_new001",
        filename: "checkout.spec.ts",
        baseUrl: "http://localhost:3000",
      });
    });
    expect(result.current.managerState.activeFileId).toBe("e2e_new001");
  });

  it("returns success with fileId", async () => {
    const { result } = renderHook(() => useSubject());
    let response: Record<string, unknown> | undefined;
    await act(async () => {
      response = await result.current.tools.createTestFile({
        id: "e2e_new001",
        filename: "checkout.spec.ts",
        baseUrl: "http://localhost:3000",
      });
    });
    expect(response).toMatchObject({ success: true, fileId: "e2e_new001" });
  });

  it("new file starts with empty testCases", async () => {
    const { result } = renderHook(() => useSubject());
    await act(async () => {
      await result.current.tools.createTestFile({
        id: "e2e_new001",
        filename: "checkout.spec.ts",
        baseUrl: "http://localhost:3000",
      });
    });
    expect(result.current.activeFile.testCases).toHaveLength(0);
  });
});

// ─── switchTestFile ───────────────────────────────────────────────────────────

describe("switchTestFile", () => {
  it("switches the active file by id", async () => {
    const { result } = renderHook(() => useSubject());
    const originalId = result.current.managerState.activeFileId;

    await act(async () => {
      await result.current.tools.createTestFile({
        id: "e2e_new001",
        filename: "checkout.spec.ts",
        baseUrl: "http://localhost:3000",
      });
      await result.current.tools.switchTestFile({ fileId: originalId });
    });

    expect(result.current.managerState.activeFileId).toBe(originalId);
  });

  it("returns success", async () => {
    const { result } = renderHook(() => useSubject());
    const response = await result.current.tools.switchTestFile({
      fileId: result.current.managerState.activeFileId,
    });
    expect(response).toMatchObject({ success: true });
  });
});

// ─── removeTestFile ───────────────────────────────────────────────────────────

describe("removeTestFile", () => {
  it("removes a file by id", async () => {
    const { result } = renderHook(() => useSubject());
    await act(async () => {
      await result.current.tools.createTestFile({
        id: "e2e_new001",
        filename: "checkout.spec.ts",
        baseUrl: "http://localhost:3000",
      });
    });
    const fileToRemove = result.current.managerState.files.find(
      (f) => f.filename === "checkout.spec.ts"
    ) as TestFile;
    await act(async () => {
      await result.current.tools.removeTestFile({ fileId: fileToRemove.id });
    });
    expect(result.current.managerState.files).toHaveLength(1);
    expect(result.current.managerState.files.every((f) => f.id !== fileToRemove.id)).toBe(true);
  });

  it("does not remove the last file", async () => {
    const { result } = renderHook(() => useSubject());
    const onlyFileId = result.current.managerState.activeFileId;
    await act(async () => {
      await result.current.tools.removeTestFile({ fileId: onlyFileId });
    });
    expect(result.current.managerState.files).toHaveLength(1);
  });

  it("switches active to first remaining file when active is removed", async () => {
    const { result } = renderHook(() => useSubject());
    const firstId = result.current.managerState.activeFileId;

    await act(async () => {
      await result.current.tools.createTestFile({
        id: "e2e_second",
        filename: "second.spec.ts",
        baseUrl: "http://localhost:3000",
      });
      await result.current.tools.switchTestFile({ fileId: firstId });
    });
    await act(async () => {
      await result.current.tools.removeTestFile({ fileId: firstId });
    });

    expect(result.current.managerState.activeFileId).not.toBe(firstId);
  });
});

// ─── addNetworkIntercept (new) ────────────────────────────────────────────────

describe("addNetworkIntercept", () => {
  it("prepends an intercept step to the test case by default", async () => {
    const { result } = renderHook(() => useSubject());
    await act(async () => {
      await result.current.tools.addTestCase(validTestCase);
      await result.current.tools.addNetworkIntercept({
        testCaseId: "tc_abc123",
        method: "GET",
        urlPattern: "**/api/users",
        status: 200,
        responseBody: { data: [] },
      });
    });
    const steps = (result.current.activeFile.testCases[0] as TestCase).steps;
    expect(steps[0]?.action).toBe("intercept");
  });

  it("intercept step has correct method and urlPattern", async () => {
    const { result } = renderHook(() => useSubject());
    await act(async () => {
      await result.current.tools.addTestCase(validTestCase);
      await result.current.tools.addNetworkIntercept({
        testCaseId: "tc_abc123",
        method: "POST",
        urlPattern: "/api/orders",
        status: 422,
        responseBody: { errors: ["out of stock"] },
      });
    });
    const step = (result.current.activeFile.testCases[0] as TestCase).steps[0] as TestStep;
    expect(step.action).toBe("intercept");
    if (step.action === "intercept") {
      expect(step.method).toBe("POST");
      expect(step.urlPattern).toBe("/api/orders");
      expect(step.status).toBe(422);
    }
  });

  it("intercept step has null body when responseBody is null", async () => {
    const { result } = renderHook(() => useSubject());
    await act(async () => {
      await result.current.tools.addTestCase(validTestCase);
      await result.current.tools.addNetworkIntercept({
        testCaseId: "tc_abc123",
        method: "DELETE",
        urlPattern: "/api/items/1",
        status: 204,
        responseBody: null,
      });
    });
    const step = (result.current.activeFile.testCases[0] as TestCase).steps[0] as TestStep;
    if (step.action === "intercept") {
      expect(step.body).toBeNull();
    }
  });

  it("inserts before a specific step when insertBeforeStepId is provided", async () => {
    const { result } = renderHook(() => useSubject());
    await act(async () => {
      await result.current.tools.addTestCase(validTestCase);
    });
    const targetStepId = ((result.current.activeFile.testCases[0] as TestCase).steps[1] as TestStep)
      .id;

    await act(async () => {
      await result.current.tools.addNetworkIntercept({
        testCaseId: "tc_abc123",
        method: "GET",
        urlPattern: "**/api/data",
        status: 200,
        responseBody: {},
        insertBeforeStepId: targetStepId,
      });
    });

    const steps = (result.current.activeFile.testCases[0] as TestCase).steps;
    const insertedIdx = steps.findIndex((s) => s.action === "intercept");
    const targetIdx = steps.findIndex((s) => s.id === targetStepId);
    expect(insertedIdx).toBe(targetIdx - 1);
  });

  it("returns success with a stepId", async () => {
    const { result } = renderHook(() => useSubject());
    await act(async () => {
      await result.current.tools.addTestCase(validTestCase);
    });
    let response: Record<string, unknown> | undefined;
    await act(async () => {
      response = await result.current.tools.addNetworkIntercept({
        testCaseId: "tc_abc123",
        method: "GET",
        urlPattern: "**/api/users",
        status: 200,
        responseBody: null,
      });
    });
    expect(response).toMatchObject({ success: true, stepId: expect.stringMatching(/^step_/) });
  });

  it("intercept step id starts with step_", async () => {
    const { result } = renderHook(() => useSubject());
    await act(async () => {
      await result.current.tools.addTestCase(validTestCase);
      await result.current.tools.addNetworkIntercept({
        testCaseId: "tc_abc123",
        method: "GET",
        urlPattern: "**/api/ping",
        status: 200,
        responseBody: null,
      });
    });
    const step = (result.current.activeFile.testCases[0] as TestCase).steps[0] as TestStep;
    expect(step.id).toMatch(/^step_/);
  });

  it("does not modify other test cases", async () => {
    const { result } = renderHook(() => useSubject());
    await act(async () => {
      await result.current.tools.addTestCase(validTestCase);
      await result.current.tools.addTestCase({
        ...validTestCase,
        id: "tc_other",
        name: "Other",
        steps: [],
      });
      await result.current.tools.addNetworkIntercept({
        testCaseId: "tc_abc123",
        method: "GET",
        urlPattern: "**/api/ping",
        status: 200,
        responseBody: null,
      });
    });
    const otherTc = result.current.activeFile.testCases.find(
      (t) => t.id === "tc_other"
    ) as TestCase;
    expect(otherTc.steps).toHaveLength(0);
  });
});

// ─── generateCIConfig (new) ───────────────────────────────────────────────────

describe("generateCIConfig", () => {
  it("returns a yaml string", async () => {
    const { result } = renderHook(() => useSubject());
    const response = await result.current.tools.generateCIConfig({});
    expect(response).toMatchObject({ success: true });
    expect(typeof response.yaml).toBe("string");
    expect((response.yaml as string).length).toBeGreaterThan(0);
  });

  it("yaml contains Playwright Tests workflow name", async () => {
    const { result } = renderHook(() => useSubject());
    const response = await result.current.tools.generateCIConfig({});
    expect(response.yaml).toContain("Playwright Tests");
  });

  it("yaml references the provided node version", async () => {
    const { result } = renderHook(() => useSubject());
    const response = await result.current.tools.generateCIConfig({ nodeVersion: "22" });
    expect(response.yaml).toContain("22");
  });

  it("yaml contains the provided browser", async () => {
    const { result } = renderHook(() => useSubject());
    const response = await result.current.tools.generateCIConfig({ browsers: ["firefox"] });
    expect(response.yaml).toContain("firefox");
  });

  it("generates a separate job for each tag", async () => {
    const { result } = renderHook(() => useSubject());
    const response = await result.current.tools.generateCIConfig({ tags: ["smoke", "regression"] });
    expect(response.yaml).toContain("test-smoke");
    expect(response.yaml).toContain("test-regression");
  });

  it("uses @tag grep pattern in tagged job", async () => {
    const { result } = renderHook(() => useSubject());
    const response = await result.current.tools.generateCIConfig({ tags: ["smoke"] });
    expect(response.yaml).toContain("@smoke");
  });

  it("defaults to chromium and node 20 when nothing is provided", async () => {
    const { result } = renderHook(() => useSubject());
    const response = await result.current.tools.generateCIConfig({});
    expect(response.yaml).toContain("chromium");
    expect(response.yaml).toContain('"20"');
  });

  it("includes on: push and on: pull_request triggers", async () => {
    const { result } = renderHook(() => useSubject());
    const response = await result.current.tools.generateCIConfig({});
    expect(response.yaml).toContain("push:");
    expect(response.yaml).toContain("pull_request");
  });
});

// ─── generateTraceConfig (new) ───────────────────────────────────────────────

describe("generateTraceConfig", () => {
  it("returns a snippet string", async () => {
    const { result } = renderHook(() => useSubject());
    const response = await result.current.tools.generateTraceConfig({});
    expect(response).toMatchObject({ success: true });
    expect(typeof response.snippet).toBe("string");
  });

  it("snippet contains the trace mode", async () => {
    const { result } = renderHook(() => useSubject());
    const response = await result.current.tools.generateTraceConfig({ traceMode: "on" });
    expect(response.snippet).toContain('"on"');
  });

  it("snippet defaults to on-first-retry", async () => {
    const { result } = renderHook(() => useSubject());
    const response = await result.current.tools.generateTraceConfig({});
    expect(response.snippet).toContain("on-first-retry");
  });

  it("snippet contains show-trace command", async () => {
    const { result } = renderHook(() => useSubject());
    const response = await result.current.tools.generateTraceConfig({});
    expect(response.snippet).toContain("show-trace");
  });

  it("also returns a spec string of the current file", async () => {
    const { result } = renderHook(() => useSubject());
    const response = await result.current.tools.generateTraceConfig({});
    expect(typeof response.spec).toBe("string");
  });

  it("supports all valid trace modes", async () => {
    const modes = ["on", "on-first-retry", "on-all-retries", "retain-on-failure"] as const;
    const { result } = renderHook(() => useSubject());
    for (const traceMode of modes) {
      const response = await result.current.tools.generateTraceConfig({ traceMode });
      expect(response.snippet).toContain(traceMode);
    }
  });
});
