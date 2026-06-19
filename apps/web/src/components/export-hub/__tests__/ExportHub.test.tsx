import { describe, it, expect, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ExportHub } from "../ExportHub";
import type { FormSchema } from "@ai-builder/schemas";

// Mock the serializers so tests are deterministic and fast
vi.mock("@ai-builder/serializers", () => ({
  generateZodSchema: () => `// zod schema\nexport const TestSchema = z.object({});`,
  generateReactHookForm: () => `// rhf component\nexport function TestForm() {}`,
  generateFormikForm: () => `// formik component\nexport function TestForm() {}`,
  generateHtml: () => `<!DOCTYPE html><html><body>test</body></html>`,
}));

const schema: FormSchema = {
  id: "form_1",
  title: "Test Form",
  description: null,
  submitLabel: "Submit",
  layout: "single-column",
  fields: [
    {
      id: "f_abc123",
      type: "text",
      name: "name",
      label: "Name",
      placeholder: null,
      defaultValue: null,
      options: null,
      validation: null,
      className: null,
      helpText: null,
      disabled: null,
      hidden: null,
    },
  ],
};

describe("ExportHub", () => {
  it("renders an Export button", () => {
    render(<ExportHub schema={schema} />);
    expect(screen.getByRole("button", { name: /export/i })).toBeInTheDocument();
  });

  it("opens a dialog modal when Export is clicked", async () => {
    render(<ExportHub schema={schema} />);
    await userEvent.click(screen.getByRole("button", { name: /export/i }));
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("shows the form title in the dialog header", async () => {
    render(<ExportHub schema={schema} />);
    await userEvent.click(screen.getByRole("button", { name: /export/i }));
    expect(screen.getByRole("heading", { name: /export.*test form/i })).toBeInTheDocument();
  });

  it("renders all 5 format tabs", async () => {
    render(<ExportHub schema={schema} />);
    await userEvent.click(screen.getByRole("button", { name: /export/i }));
    expect(screen.getByRole("tab", { name: /json schema/i })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /zod/i })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /react hook form/i })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /formik/i })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /html/i })).toBeInTheDocument();
  });

  it("shows JSON content by default on the active tab", async () => {
    render(<ExportHub schema={schema} />);
    await userEvent.click(screen.getByRole("button", { name: /export/i }));
    // Default tab is JSON — the schema JSON should be rendered
    await waitFor(() => {
      expect(screen.getByText(/"id"/)).toBeInTheDocument();
    });
  });

  it("renders Copy and Download buttons on the active tab", async () => {
    render(<ExportHub schema={schema} />);
    await userEvent.click(screen.getByRole("button", { name: /export/i }));
    expect(screen.getByRole("button", { name: /copy/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /download/i })).toBeInTheDocument();
  });

  it("switches to Zod tab and shows the mocked code", async () => {
    render(<ExportHub schema={schema} />);
    await userEvent.click(screen.getByRole("button", { name: /export/i }));
    await userEvent.click(screen.getByRole("tab", { name: /zod/i }));
    await waitFor(() => {
      expect(screen.getByText(/zod schema/)).toBeInTheDocument();
    });
  });

  it("shows the filename in the code block", async () => {
    render(<ExportHub schema={schema} />);
    await userEvent.click(screen.getByRole("button", { name: /export/i }));
    // Default tab: test-form.json
    await waitFor(() => {
      expect(screen.getByText("test-form.json")).toBeInTheDocument();
    });
  });

  it("copies to clipboard when Copy is clicked", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, { clipboard: { writeText } });

    render(<ExportHub schema={schema} />);
    await userEvent.click(screen.getByRole("button", { name: /export/i }));
    await userEvent.click(screen.getByRole("button", { name: /copy/i }));
    expect(writeText).toHaveBeenCalled();
  });
});
