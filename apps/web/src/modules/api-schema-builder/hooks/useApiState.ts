import { useState } from "react";
import { nanoid } from "nanoid";
import type { OpenApiSpec } from "@ai-builder/schemas";

export function makeEmptySpec(): OpenApiSpec {
  return {
    id: "api_" + nanoid(6),
    title: "My API",
    version: "1.0.0",
    baseUrl: null,
    securityScheme: null,
    description: null,
    endpoints: [],
    schemas: [],
  };
}

export function useApiState() {
  const [spec, setSpec] = useState<OpenApiSpec>(makeEmptySpec);
  return { spec, setSpec };
}
