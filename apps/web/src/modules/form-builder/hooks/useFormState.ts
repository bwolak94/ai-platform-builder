import { useState } from "react";
import { nanoid } from "nanoid";
import type { FormSchema } from "@ai-builder/schemas";

export function makeEmptyForm(): FormSchema {
  return {
    id: `form_${nanoid(8)}`,
    title: "Untitled Form",
    description: null,
    submitLabel: "Submit",
    fields: [],
    layout: "single-column",
  };
}

export function useFormState() {
  const [formSchema, setFormSchema] = useState<FormSchema>(makeEmptyForm);
  return { formSchema, setFormSchema };
}
