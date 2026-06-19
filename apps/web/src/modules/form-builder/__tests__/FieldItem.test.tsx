import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { FieldItem } from "../FieldItem";
import type { FormField } from "@ai-builder/schemas";

// ─── Mocks ────────────────────────────────────────────────────────────────────

vi.mock("@dnd-kit/sortable", () => ({
  useSortable: () => ({
    attributes: {},
    listeners: {},
    setNodeRef: vi.fn(),
    transform: null,
    transition: null,
    isDragging: false,
  }),
}));

vi.mock("@dnd-kit/utilities", () => ({
  CSS: { Transform: { toString: () => "" } },
}));

vi.mock("@/components/inline-actions", () => ({
  InlineActionChips: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const baseField: FormField = {
  id: "f_abc123",
  type: "text",
  name: "firstName",
  label: "First Name",
  placeholder: null,
  defaultValue: null,
  options: null,
  validation: null,
  className: null,
  helpText: null,
  disabled: null,
  hidden: null,
};

const fieldWithValidation: FormField = {
  ...baseField,
  id: "f_def456",
  name: "email",
  label: "Email",
  type: "email",
  validation: [
    { type: "required", value: true, message: "Required" },
    { type: "minLength", value: 5, message: "Too short" },
  ],
};

describe("FieldItem", () => {
  it("renders the field label", () => {
    render(<FieldItem field={baseField} onEdit={vi.fn()} onDelete={vi.fn()} />);
    expect(screen.getByText("First Name")).toBeInTheDocument();
  });

  it("renders the field name in monospace", () => {
    render(<FieldItem field={baseField} onEdit={vi.fn()} onDelete={vi.fn()} />);
    expect(screen.getByText("firstName")).toBeInTheDocument();
  });

  it("shows the type icon for known types", () => {
    render(<FieldItem field={baseField} onEdit={vi.fn()} onDelete={vi.fn()} />);
    // text type → "T"
    expect(screen.getByText("T")).toBeInTheDocument();
  });

  it("shows '?' for unknown field types", () => {
    const unknownField = { ...baseField, type: "unknown" as FormField["type"] };
    render(<FieldItem field={unknownField} onEdit={vi.fn()} onDelete={vi.fn()} />);
    expect(screen.getByText("?")).toBeInTheDocument();
  });

  it("renders validation badges", () => {
    render(<FieldItem field={fieldWithValidation} onEdit={vi.fn()} onDelete={vi.fn()} />);
    expect(screen.getByText("required")).toBeInTheDocument();
    expect(screen.getByText("minLength")).toBeInTheDocument();
  });

  it("renders no badges when validation is null", () => {
    const { container } = render(
      <FieldItem field={baseField} onEdit={vi.fn()} onDelete={vi.fn()} />
    );
    const badges = container.querySelectorAll('[class*="badge"]');
    expect(badges).toHaveLength(0);
  });

  it("calls onEdit with the field when Edit button is clicked", async () => {
    const onEdit = vi.fn();
    render(<FieldItem field={baseField} onEdit={onEdit} onDelete={vi.fn()} />);
    await userEvent.click(screen.getByRole("button", { name: /edit first name/i }));
    expect(onEdit).toHaveBeenCalledWith(baseField);
  });

  it("calls onDelete with the field id when Delete button is clicked", async () => {
    const onDelete = vi.fn();
    render(<FieldItem field={baseField} onEdit={vi.fn()} onDelete={onDelete} />);
    await userEvent.click(screen.getByRole("button", { name: /delete first name/i }));
    expect(onDelete).toHaveBeenCalledWith("f_abc123");
  });

  it("has a drag handle button with aria-label", () => {
    render(<FieldItem field={baseField} onEdit={vi.fn()} onDelete={vi.fn()} />);
    expect(screen.getByRole("button", { name: /drag to reorder/i })).toBeInTheDocument();
  });

  it("renders the email type icon @ for email fields", () => {
    render(<FieldItem field={fieldWithValidation} onEdit={vi.fn()} onDelete={vi.fn()} />);
    expect(screen.getByText("@")).toBeInTheDocument();
  });
});
