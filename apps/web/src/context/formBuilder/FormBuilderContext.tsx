import { createContext, useContext, useState } from "react";
import { nanoid } from "nanoid";
import type { FormSchema } from "@ai-builder/schemas";

function makeEmptyForm(): FormSchema {
  return {
    id: `form_${nanoid(8)}`,
    title: "Untitled Form",
    description: null,
    submitLabel: "Submit",
    fields: [],
    layout: "single-column",
  };
}

interface FormBuilderContextValue {
  formSchema: FormSchema;
  setFormSchema: React.Dispatch<React.SetStateAction<FormSchema>>;
}

const FormBuilderContext = createContext<FormBuilderContextValue | null>(null);

export function FormBuilderProvider({ children }: { children: React.ReactNode }) {
  const [formSchema, setFormSchema] = useState<FormSchema>(makeEmptyForm);
  return (
    <FormBuilderContext.Provider value={{ formSchema, setFormSchema }}>
      {children}
    </FormBuilderContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useFormBuilderContext(): FormBuilderContextValue {
  const ctx = useContext(FormBuilderContext);
  if (!ctx) throw new Error("useFormBuilderContext must be used inside FormBuilderProvider");
  return ctx;
}
