import { useState } from "react";
import { nanoid } from "nanoid";
import type { TestFile } from "@ai-builder/schemas";

function createDefaultTestFile(): TestFile {
  return {
    id: "e2e_" + nanoid(6),
    filename: "app.spec.ts",
    baseUrl: "http://localhost:3000",
    description: null,
    testCases: [],
  };
}

export function useE2eState() {
  const [testFile, setTestFile] = useState<TestFile>(createDefaultTestFile);
  return { testFile, setTestFile };
}
