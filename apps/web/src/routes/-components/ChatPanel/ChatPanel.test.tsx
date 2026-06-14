import { describe, it, expect, vi, beforeAll } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ChatPanel } from "./ChatPanel";
import type { ChatMessage } from "@/hooks/useBuilderAgent/useBuilderAgent.types";

beforeAll(() => {
  window.HTMLElement.prototype.scrollIntoView = vi.fn();
});

const baseProps = {
  messages: [] as ChatMessage[],
  input: "",
  isLoading: false,
  activeToolCall: null,
  onInputChange: vi.fn(),
  onSubmit: vi.fn(),
};

describe("ChatPanel", () => {
  it("shows placeholder when no messages", () => {
    render(<ChatPanel {...baseProps} />);
    expect(screen.getByPlaceholderText("Ask the agent...")).toBeInTheDocument();
    expect(screen.getByText(/Describe what you want to build/)).toBeInTheDocument();
  });

  it("renders user and assistant messages", () => {
    const messages: ChatMessage[] = [
      { id: "1", role: "user", content: "Make a form" },
      { id: "2", role: "assistant", content: "Sure, here it is" },
    ];
    render(<ChatPanel {...baseProps} messages={messages} />);
    expect(screen.getByText("Make a form")).toBeInTheDocument();
    expect(screen.getByText("Sure, here it is")).toBeInTheDocument();
  });

  it("shows loading indicator while isLoading", () => {
    render(<ChatPanel {...baseProps} isLoading={true} />);
    expect(screen.getByText("...")).toBeInTheDocument();
  });

  it("shows active tool call status", () => {
    render(<ChatPanel {...baseProps} activeToolCall="updateField" />);
    expect(screen.getByText("Running tool: updateField")).toBeInTheDocument();
  });

  it("calls onInputChange when typing", async () => {
    const onInputChange = vi.fn();
    render(<ChatPanel {...baseProps} onInputChange={onInputChange} />);
    await userEvent.type(screen.getByPlaceholderText("Ask the agent..."), "Hello");
    expect(onInputChange).toHaveBeenCalled();
  });

  it("disables input and send button while loading", () => {
    render(<ChatPanel {...baseProps} isLoading={true} />);
    expect(screen.getByPlaceholderText("Ask the agent...")).toBeDisabled();
    expect(screen.getByRole("button", { name: "Send" })).toBeDisabled();
  });

  it("disables send button when input is empty", () => {
    render(<ChatPanel {...baseProps} input="" />);
    expect(screen.getByRole("button", { name: "Send" })).toBeDisabled();
  });

  it("enables send button when input has content", () => {
    render(<ChatPanel {...baseProps} input="Hello" />);
    expect(screen.getByRole("button", { name: "Send" })).not.toBeDisabled();
  });
});
