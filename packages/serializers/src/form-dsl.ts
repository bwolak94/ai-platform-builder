// Form DSL serializer — implemented in TASK-003
// Compact representation: FORM: {title} | layout:{layout}
// {id} {type}:{name} "{label}" [{validation}]

import type { FormSchema } from "@ai-builder/schemas";

export function serializeFormDSL(_schema: FormSchema): string {
  // TODO: implement in TASK-003
  return "";
}

export function deserializeFormDSL(_dsl: string): FormSchema {
  // TODO: implement in TASK-003
  return {};
}
