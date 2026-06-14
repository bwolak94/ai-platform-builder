import { describe, it, expect } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useFormState } from "../hooks/useFormState";
import { useFormTools } from "../hooks/useFormTools";
import type { FormField } from "@ai-builder/schemas";

const validField: FormField = {
  id: "f_aaa111",
  type: "text",
  name: "fullName",
  label: "Full name",
  placeholder: null,
  defaultValue: null,
  options: null,
  validation: [{ type: "required", value: true, message: "Required" }],
  className: null,
  helpText: null,
  disabled: null,
  hidden: null,
};

const secondField: FormField = {
  id: "f_bbb222",
  type: "email",
  name: "email",
  label: "Email",
  placeholder: null,
  defaultValue: null,
  options: null,
  validation: null,
  className: null,
  helpText: null,
  disabled: null,
  hidden: null,
};

function useSubject() {
  const { formSchema, setFormSchema } = useFormState();
  const tools = useFormTools(formSchema, setFormSchema);
  return { formSchema, tools };
}

describe("useFormTools", () => {
  it("addField appends a field to the end", async () => {
    const { result } = renderHook(() => useSubject());
    await act(async () => {
      await result.current.tools.addField({ field: validField });
    });
    expect(result.current.formSchema.fields).toHaveLength(1);
    expect(result.current.formSchema.fields[0]?.id).toBe("f_aaa111");
  });

  it("addField returns error for invalid field shape", async () => {
    const { result } = renderHook(() => useSubject());
    // No state update happens on error path — safe to call outside act
    const response = await result.current.tools.addField({ field: { id: "bad" } });
    expect(response).toMatchObject({ error: expect.any(String) });
    expect(result.current.formSchema.fields).toHaveLength(0);
  });

  it("addField inserts after specified fieldId", async () => {
    const { result } = renderHook(() => useSubject());
    await act(async () => {
      await result.current.tools.addField({ field: validField });
      await result.current.tools.addField({ field: secondField, afterFieldId: "f_aaa111" });
    });
    const ids = result.current.formSchema.fields.map((f) => f.id);
    expect(ids).toEqual(["f_aaa111", "f_bbb222"]);
  });

  it("removeField deletes the correct field", async () => {
    const { result } = renderHook(() => useSubject());
    await act(async () => {
      await result.current.tools.addField({ field: validField });
      await result.current.tools.addField({ field: secondField });
      await result.current.tools.removeField({ fieldId: "f_aaa111" });
    });
    expect(result.current.formSchema.fields).toHaveLength(1);
    expect(result.current.formSchema.fields[0]?.id).toBe("f_bbb222");
  });

  it("updateField changes only specified properties", async () => {
    const { result } = renderHook(() => useSubject());
    await act(async () => {
      await result.current.tools.addField({ field: validField });
      await result.current.tools.updateField({
        fieldId: "f_aaa111",
        updates: { label: "Updated label" },
      });
    });
    const field = result.current.formSchema.fields[0];
    expect(field?.label).toBe("Updated label");
    expect(field?.name).toBe("fullName"); // unchanged
    expect(field?.validation).toHaveLength(1); // unchanged
  });

  it("reorderFields reorders fields by provided id array", async () => {
    const { result } = renderHook(() => useSubject());
    await act(async () => {
      await result.current.tools.addField({ field: validField });
      await result.current.tools.addField({ field: secondField });
      await result.current.tools.reorderFields({ orderedIds: ["f_bbb222", "f_aaa111"] });
    });
    const ids = result.current.formSchema.fields.map((f) => f.id);
    expect(ids).toEqual(["f_bbb222", "f_aaa111"]);
  });

  it("querySchema returns serialized DSL string", async () => {
    const { result } = renderHook(() => useSubject());
    await act(() => result.current.tools.addField({ field: validField }));
    // querySchema is a pure read — no state update
    const response = await result.current.tools.querySchema();
    expect(response).toMatchObject({ schema: expect.stringContaining("FORM:") });
  });
});
