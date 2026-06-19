import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { InlineActionChips } from "../InlineActionChips";
import type { FormField } from "@ai-builder/schemas";

// ─── Mock AgentActionsContext ─────────────────────────────────────────────────

const mockSetInput = vi.fn();
const mockSendMessage = vi.fn();

vi.mock("@/context/agentActions/AgentActionsContext", () => ({
  useAgentActions: () => ({
    setInput: mockSetInput,
    sendMessage: mockSendMessage,
  }),
}));

// ─── Fixture ──────────────────────────────────────────────────────────────────

const field: FormField = {
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

describe("InlineActionChips", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the trigger children", () => {
    render(
      <InlineActionChips field={field}>
        <button type="button">field item</button>
      </InlineActionChips>
    );
    expect(screen.getByRole("button", { name: "field item" })).toBeInTheDocument();
  });

  it("opens the popover and shows chip buttons on trigger click", async () => {
    render(
      <InlineActionChips field={field}>
        <button type="button">field item</button>
      </InlineActionChips>
    );
    await userEvent.click(screen.getByRole("button", { name: "field item" }));
    expect(screen.getByRole("button", { name: /required/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /validate/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /duplicate/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /help text/i })).toBeInTheDocument();
  });

  it("calls sendMessage when 'Required' chip is clicked", async () => {
    render(
      <InlineActionChips field={field}>
        <button type="button">field item</button>
      </InlineActionChips>
    );
    await userEvent.click(screen.getByRole("button", { name: "field item" }));
    await userEvent.click(screen.getByRole("button", { name: /required/i }));
    expect(mockSendMessage).toHaveBeenCalledOnce();
    expect(mockSetInput).not.toHaveBeenCalled();
    // Prompt should reference the field label and ID
    const prompt = mockSendMessage.mock.calls[0]?.[0] as string;
    expect(prompt).toContain("First Name");
    expect(prompt).toContain("f_abc123");
  });

  it("calls sendMessage (not setInput) for add-validation chip", async () => {
    render(
      <InlineActionChips field={field}>
        <button type="button">field item</button>
      </InlineActionChips>
    );
    await userEvent.click(screen.getByRole("button", { name: "field item" }));
    await userEvent.click(screen.getByRole("button", { name: /validate/i }));
    expect(mockSendMessage).toHaveBeenCalledOnce();
    expect(mockSetInput).not.toHaveBeenCalled();
  });

  it("calls sendMessage (not setInput) for duplicate chip", async () => {
    render(
      <InlineActionChips field={field}>
        <button type="button">field item</button>
      </InlineActionChips>
    );
    await userEvent.click(screen.getByRole("button", { name: "field item" }));
    await userEvent.click(screen.getByRole("button", { name: /duplicate/i }));
    expect(mockSendMessage).toHaveBeenCalledOnce();
  });

  it("calls sendMessage (not setInput) for help text chip", async () => {
    render(
      <InlineActionChips field={field}>
        <button type="button">field item</button>
      </InlineActionChips>
    );
    await userEvent.click(screen.getByRole("button", { name: "field item" }));
    await userEvent.click(screen.getByRole("button", { name: /help text/i }));
    expect(mockSendMessage).toHaveBeenCalledOnce();
    expect(mockSetInput).not.toHaveBeenCalled();
  });

  it("chip titles include a prompt preview", async () => {
    render(
      <InlineActionChips field={field}>
        <button type="button">field item</button>
      </InlineActionChips>
    );
    await userEvent.click(screen.getByRole("button", { name: "field item" }));
    const requiredBtn = screen.getByRole("button", { name: /required/i });
    expect(requiredBtn.getAttribute("title")).toContain("First Name");
  });
});
