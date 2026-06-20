import { describe, it, expect, vi, beforeAll } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ChatPanel } from "./ChatPanel";
import type { ChatMessage } from "@/hooks/useBuilderAgent/useBuilderAgent.types";

beforeAll(() => {
  window.HTMLElement.prototype.scrollIntoView = vi.fn();
});

const NOW = Date.now();

const baseProps = {
  messages: [] as ChatMessage[],
  input: "",
  isLoading: false,
  activeToolCall: null,
  onInputChange: vi.fn(),
  onSubmit: vi.fn(),
  onClear: vi.fn(),
  onStop: vi.fn(),
};

describe("ChatPanel", () => {
  it("shows placeholder when no messages", () => {
    render(<ChatPanel {...baseProps} />);
    expect(screen.getByPlaceholderText("Ask the agent… (⌘↵ to send)")).toBeInTheDocument();
    expect(screen.getByText(/Describe what you want to build/)).toBeInTheDocument();
  });

  it("renders user and assistant messages", () => {
    const messages: ChatMessage[] = [
      { id: "1", role: "user", content: "Make a form", timestamp: NOW },
      { id: "2", role: "assistant", content: "Sure, here it is", timestamp: NOW },
    ];
    render(<ChatPanel {...baseProps} messages={messages} />);
    expect(screen.getByText("Make a form")).toBeInTheDocument();
    expect(screen.getByText("Sure, here it is")).toBeInTheDocument();
  });

  it("shows loading indicator while isLoading", () => {
    render(<ChatPanel {...baseProps} isLoading={true} status="submitted" />);
    expect(screen.getByText("Thinking")).toBeInTheDocument();
  });

  it("shows applying phase when tool is active and loading", () => {
    render(
      <ChatPanel {...baseProps} isLoading={true} status="streaming" activeToolCall="addEndpoint" />
    );
    expect(screen.getByText("Applying")).toBeInTheDocument();
    expect(screen.getByText("· add endpoint")).toBeInTheDocument();
  });

  it("shows responding phase when streaming with no tool", () => {
    render(<ChatPanel {...baseProps} isLoading={true} status="streaming" />);
    expect(screen.getByText("Responding")).toBeInTheDocument();
  });

  it("shows active tool call status", () => {
    render(<ChatPanel {...baseProps} activeToolCall="updateField" />);
    expect(screen.getByText("Running tool: updateField")).toBeInTheDocument();
  });

  it("calls onInputChange when typing", async () => {
    const onInputChange = vi.fn();
    render(<ChatPanel {...baseProps} onInputChange={onInputChange} />);
    await userEvent.type(screen.getByPlaceholderText("Ask the agent… (⌘↵ to send)"), "Hello");
    expect(onInputChange).toHaveBeenCalled();
  });

  it("disables input while loading and shows Stop button", () => {
    render(<ChatPanel {...baseProps} isLoading={true} />);
    expect(screen.getByPlaceholderText("Ask the agent… (⌘↵ to send)")).toBeDisabled();
    expect(screen.getByRole("button", { name: "Stop generation" })).toBeInTheDocument();
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
