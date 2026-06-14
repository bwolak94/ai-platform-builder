import { serializeE2eDSL } from "@ai-builder/serializers";
import { TestCaseSchema } from "@ai-builder/schemas";
import type { TestFile, TestCase, TestStep } from "@ai-builder/schemas";
import type React from "react";
import { nanoid } from "nanoid";

type Setter = React.Dispatch<React.SetStateAction<TestFile>>;
type ToolResult = Record<string, unknown>;

interface SimpleResult {
  success: true;
}

export function useE2eTools(testFile: TestFile, setTestFile: Setter) {
  return {
    setFileInfo: ({
      filename,
      baseUrl,
      description,
    }: {
      filename?: string;
      baseUrl?: string;
      description?: string | null;
    }): Promise<SimpleResult> => {
      setTestFile((prev) => ({
        ...prev,
        filename: filename ?? prev.filename,
        baseUrl: baseUrl ?? prev.baseUrl,
        description: description !== undefined ? description : prev.description,
      }));
      return Promise.resolve({ success: true });
    },

    addTestCase: ({ testCase }: { testCase: unknown }): Promise<ToolResult> => {
      const parsed = TestCaseSchema.safeParse(testCase);
      if (!parsed.success) return Promise.resolve({ error: parsed.error.message });
      setTestFile((prev) => ({
        ...prev,
        testCases: [...prev.testCases, parsed.data],
      }));
      return Promise.resolve({ success: true, testCaseId: parsed.data.id });
    },

    removeTestCase: ({ testCaseId }: { testCaseId: string }): Promise<SimpleResult> => {
      setTestFile((prev) => ({
        ...prev,
        testCases: prev.testCases.filter((tc) => tc.id !== testCaseId),
      }));
      return Promise.resolve({ success: true });
    },

    addStep: ({
      testCaseId,
      step,
    }: {
      testCaseId: string;
      step: TestStep;
    }): Promise<SimpleResult> => {
      setTestFile((prev) => ({
        ...prev,
        testCases: prev.testCases.map((tc) =>
          tc.id === testCaseId ? { ...tc, steps: [...tc.steps, step] } : tc
        ),
      }));
      return Promise.resolve({ success: true });
    },

    removeStep: ({
      testCaseId,
      stepIndex,
    }: {
      testCaseId: string;
      stepIndex: number;
    }): Promise<SimpleResult> => {
      setTestFile((prev) => ({
        ...prev,
        testCases: prev.testCases.map((tc) =>
          tc.id === testCaseId ? { ...tc, steps: tc.steps.filter((_, i) => i !== stepIndex) } : tc
        ),
      }));
      return Promise.resolve({ success: true });
    },

    reorderTestCases: ({ orderedIds }: { orderedIds: string[] }): Promise<SimpleResult> => {
      setTestFile((prev) => {
        const map = Object.fromEntries(prev.testCases.map((tc) => [tc.id, tc]));
        const testCases = orderedIds
          .map((id) => map[id])
          .filter((tc): tc is TestCase => tc !== undefined);
        return { ...prev, testCases };
      });
      return Promise.resolve({ success: true });
    },

    reset: (): Promise<SimpleResult> => {
      setTestFile({
        id: "e2e_" + nanoid(6),
        filename: "app.spec.ts",
        baseUrl: "http://localhost:3000",
        description: null,
        testCases: [],
      });
      return Promise.resolve({ success: true });
    },

    querySpec: (): Promise<{ dsl: string }> => {
      return Promise.resolve({ dsl: serializeE2eDSL(testFile) });
    },
  };
}

export type E2eTools = ReturnType<typeof useE2eTools>;
