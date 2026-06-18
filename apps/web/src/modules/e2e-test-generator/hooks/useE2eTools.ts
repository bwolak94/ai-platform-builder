import { serializeE2eDSL } from "@ai-builder/serializers";
import { TestCaseSchema, TestStepSchema } from "@ai-builder/schemas";
import type { TestCase, TestStep, TestManagerState, TestFile } from "@ai-builder/schemas";
import { nanoid } from "nanoid";

type ManagerSetter = (updater: TestFile | ((prev: TestFile) => TestFile)) => void;
type StateSetter = (
  updater: TestManagerState | ((prev: TestManagerState) => TestManagerState)
) => void;
type ToolResult = Record<string, unknown>;

export function useE2eTools(
  activeFile: TestFile,
  setActiveFile: ManagerSetter,
  managerState: TestManagerState,
  setManagerState: StateSetter
) {
  return {
    querySpec: (): Promise<{ dsl: string }> =>
      Promise.resolve({ dsl: serializeE2eDSL(activeFile) }),

    setFileInfo: ({
      filename,
      baseUrl,
      description,
    }: {
      filename?: string;
      baseUrl?: string;
      description?: string | null;
    }): Promise<ToolResult> => {
      setActiveFile((prev) => ({
        ...prev,
        filename: filename ?? prev.filename,
        baseUrl: baseUrl ?? prev.baseUrl,
        description: description !== undefined ? description : prev.description,
      }));
      return Promise.resolve({ success: true });
    },

    addTestCase: (args: unknown): Promise<ToolResult> => {
      const parsed = TestCaseSchema.safeParse(args);
      if (!parsed.success) return Promise.resolve({ error: parsed.error.message });
      setActiveFile((prev) => ({
        ...prev,
        testCases: [...prev.testCases, parsed.data],
      }));
      return Promise.resolve({ success: true, testCaseId: parsed.data.id });
    },

    updateTestCase: ({
      testCaseId,
      name,
      tags,
    }: {
      testCaseId: string;
      name?: string;
      tags?: string[] | null;
    }): Promise<ToolResult> => {
      setActiveFile((prev) => ({
        ...prev,
        testCases: prev.testCases.map((tc) =>
          tc.id === testCaseId
            ? {
                ...tc,
                name: name ?? tc.name,
                tags: tags !== undefined ? tags : tc.tags,
              }
            : tc
        ),
      }));
      return Promise.resolve({ success: true });
    },

    removeTestCase: ({ testCaseId }: { testCaseId: string }): Promise<ToolResult> => {
      setActiveFile((prev) => ({
        ...prev,
        testCases: prev.testCases.filter((tc) => tc.id !== testCaseId),
      }));
      return Promise.resolve({ success: true });
    },

    duplicateTestCase: ({
      testCaseId,
      newId,
      newName,
    }: {
      testCaseId: string;
      newId: string;
      newName?: string;
    }): Promise<ToolResult> => {
      setActiveFile((prev) => {
        const tc = prev.testCases.find((t) => t.id === testCaseId);
        if (!tc) return prev;
        const copy: TestCase = {
          ...tc,
          id: newId,
          name: newName ?? tc.name + " (copy)",
          steps: tc.steps.map((s) => ({ ...s, id: "step_" + nanoid(6) })),
          beforeEach: tc.beforeEach
            ? tc.beforeEach.map((s) => ({ ...s, id: "step_" + nanoid(6) }))
            : null,
        };
        return { ...prev, testCases: [...prev.testCases, copy] };
      });
      return Promise.resolve({ success: true, newTestCaseId: newId });
    },

    addStep: ({ testCaseId, step }: { testCaseId: string; step: unknown }): Promise<ToolResult> => {
      const parsed = TestStepSchema.safeParse(step);
      if (!parsed.success) return Promise.resolve({ error: parsed.error.message });
      setActiveFile((prev) => ({
        ...prev,
        testCases: prev.testCases.map((tc) =>
          tc.id === testCaseId ? { ...tc, steps: [...tc.steps, parsed.data] } : tc
        ),
      }));
      return Promise.resolve({ success: true });
    },

    updateStep: ({
      testCaseId,
      stepId,
      step,
    }: {
      testCaseId: string;
      stepId: string;
      step: unknown;
    }): Promise<ToolResult> => {
      const parsed = TestStepSchema.safeParse(step);
      if (!parsed.success) return Promise.resolve({ error: parsed.error.message });
      setActiveFile((prev) => ({
        ...prev,
        testCases: prev.testCases.map((tc) =>
          tc.id === testCaseId
            ? { ...tc, steps: tc.steps.map((s) => (s.id === stepId ? parsed.data : s)) }
            : tc
        ),
      }));
      return Promise.resolve({ success: true });
    },

    removeStep: ({
      testCaseId,
      stepId,
    }: {
      testCaseId: string;
      stepId: string;
    }): Promise<ToolResult> => {
      setActiveFile((prev) => ({
        ...prev,
        testCases: prev.testCases.map((tc) =>
          tc.id === testCaseId ? { ...tc, steps: tc.steps.filter((s) => s.id !== stepId) } : tc
        ),
      }));
      return Promise.resolve({ success: true });
    },

    reorderSteps: ({
      testCaseId,
      orderedStepIds,
    }: {
      testCaseId: string;
      orderedStepIds: string[];
    }): Promise<ToolResult> => {
      setActiveFile((prev) => ({
        ...prev,
        testCases: prev.testCases.map((tc) => {
          if (tc.id !== testCaseId) return tc;
          const map = Object.fromEntries(tc.steps.map((s) => [s.id, s]));
          const steps = orderedStepIds
            .map((id) => map[id])
            .filter((s): s is TestStep => s !== undefined);
          return { ...tc, steps };
        }),
      }));
      return Promise.resolve({ success: true });
    },

    addBeforeEachStep: ({
      testCaseId,
      step,
    }: {
      testCaseId: string;
      step: unknown;
    }): Promise<ToolResult> => {
      const parsed = TestStepSchema.safeParse(step);
      if (!parsed.success) return Promise.resolve({ error: parsed.error.message });
      setActiveFile((prev) => ({
        ...prev,
        testCases: prev.testCases.map((tc) =>
          tc.id === testCaseId ? { ...tc, beforeEach: [...(tc.beforeEach ?? []), parsed.data] } : tc
        ),
      }));
      return Promise.resolve({ success: true });
    },

    reorderTestCases: ({ orderedIds }: { orderedIds: string[] }): Promise<ToolResult> => {
      setActiveFile((prev) => {
        const map = Object.fromEntries(prev.testCases.map((tc) => [tc.id, tc]));
        const testCases = orderedIds
          .map((id) => map[id])
          .filter((tc): tc is TestCase => tc !== undefined);
        return { ...prev, testCases };
      });
      return Promise.resolve({ success: true });
    },

    createTestFile: ({
      id,
      filename,
      baseUrl,
      description,
    }: {
      id: string;
      filename: string;
      baseUrl: string;
      description?: string | null;
    }): Promise<ToolResult> => {
      const newFile: TestFile = {
        id,
        filename,
        baseUrl,
        description: description ?? null,
        testCases: [],
      };
      setManagerState((state) => ({
        files: [...state.files, newFile],
        activeFileId: id,
      }));
      return Promise.resolve({ success: true, fileId: id });
    },

    switchTestFile: ({ fileId }: { fileId: string }): Promise<ToolResult> => {
      setManagerState((state) => ({ ...state, activeFileId: fileId }));
      return Promise.resolve({ success: true });
    },

    removeTestFile: ({ fileId }: { fileId: string }): Promise<ToolResult> => {
      setManagerState((state) => {
        if (state.files.length <= 1) return state;
        const remaining = state.files.filter((f) => f.id !== fileId);
        const newActiveId =
          state.activeFileId === fileId ? (remaining[0]?.id ?? "") : state.activeFileId;
        return { files: remaining, activeFileId: newActiveId };
      });
      return Promise.resolve({ success: true });
    },
  };
}

export type E2eTools = ReturnType<typeof useE2eTools>;
