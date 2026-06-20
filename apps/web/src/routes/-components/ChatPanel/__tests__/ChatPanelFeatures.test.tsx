/**
 * Tests for new ChatPanel features:
 * - Stop generation button
 * - Textarea auto-resize (Cmd+Enter / Enter behavior)
 * - Copy button on messages
 * - Export conversation
 * - Hint prompt search filter
 * - Show more / show less toggle
 * - Message timestamps
 * - Hex color swatches in assistant messages
 * - Mermaid code block rendering
 */
import { describe, it, expect, vi, beforeAll, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ChatPanel } from "../ChatPanel";
import type { ChatMessage } from "@/hooks/useBuilderAgent/useBuilderAgent.types";

// Mock mermaid with plain functions so vi.restoreAllMocks() doesn't break them
vi.mock("mermaid", () => ({
  default: {
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    initialize: () => {},
    render: (_id: string, _chart: string) =>
      // eslint-disable-next-line @typescript-eslint/no-empty-function
      Promise.resolve({
        svg: "<svg>diagram</svg>",
        bindFunctions: () => {},
        diagramType: "flowchart",
      }),
  },
}));

// Mock clipboard
const writeTextMock = vi.fn().mockResolvedValue(undefined);
Object.defineProperty(navigator, "clipboard", {
  value: { writeText: writeTextMock },
  configurable: true,
});

// Mock URL.createObjectURL and revokeObjectURL
URL.createObjectURL = vi.fn().mockReturnValue("blob:fake-url");
URL.revokeObjectURL = vi.fn();

beforeAll(() => {
  window.HTMLElement.prototype.scrollIntoView = vi.fn();
});

afterEach(() => {
  vi.clearAllMocks();
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

const NOW = Date.now();

function makeMessage(overrides: Partial<ChatMessage> = {}): ChatMessage {
  return {
    id: "msg-1",
    role: "user",
    content: "Hello",
    timestamp: NOW,
    ...overrides,
  };
}

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

// ─── Stop button ──────────────────────────────────────────────────────────────

describe("Stop generation button", () => {
  it("shows Stop button instead of Send while isLoading", () => {
    render(<ChatPanel {...baseProps} isLoading={true} />);
    expect(screen.getByRole("button", { name: "Stop generation" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Send" })).not.toBeInTheDocument();
  });

  it("calls onStop when Stop button is clicked", async () => {
    render(<ChatPanel {...baseProps} isLoading={true} />);
    await userEvent.click(screen.getByRole("button", { name: "Stop generation" }));
    expect(baseProps.onStop).toHaveBeenCalledOnce();
  });

  it("shows Send button when not loading", () => {
    render(<ChatPanel {...baseProps} isLoading={false} />);
    expect(screen.getByRole("button", { name: "Send" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Stop generation" })).not.toBeInTheDocument();
  });
});

// ─── Textarea ─────────────────────────────────────────────────────────────────

describe("Textarea input", () => {
  it("renders a textarea (not a single-line input)", () => {
    render(<ChatPanel {...baseProps} />);
    expect(screen.getByRole("textbox")).toBeInstanceOf(HTMLTextAreaElement);
  });

  it("submits on Ctrl+Enter", async () => {
    const onSubmit = vi.fn();
    render(<ChatPanel {...baseProps} input="Hello" onSubmit={onSubmit} />);
    const textarea = screen.getByRole("textbox");
    await userEvent.type(textarea, "{Control>}{Enter}{/Control}");
    expect(onSubmit).toHaveBeenCalled();
  });

  it("submits on Cmd+Enter (Meta key)", async () => {
    const onSubmit = vi.fn();
    render(<ChatPanel {...baseProps} input="Hello" onSubmit={onSubmit} />);
    const textarea = screen.getByRole("textbox");
    await userEvent.type(textarea, "{Meta>}{Enter}{/Meta}");
    expect(onSubmit).toHaveBeenCalled();
  });

  it("does not submit on bare Enter", () => {
    const onSubmit = vi.fn();
    render(<ChatPanel {...baseProps} input="Hello" onSubmit={onSubmit} />);
    const textarea = screen.getByRole("textbox");
    fireEvent.keyDown(textarea, { key: "Enter", metaKey: false, ctrlKey: false });
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("shows keyboard shortcut hint text", () => {
    render(<ChatPanel {...baseProps} />);
    expect(screen.getByText(/⌘↵ to send/)).toBeInTheDocument();
  });
});

// ─── Copy button on messages ──────────────────────────────────────────────────

describe("Copy button on messages", () => {
  it("renders copy button accessible on each message bubble", () => {
    const messages = [makeMessage({ id: "1", content: "First message" })];
    render(<ChatPanel {...baseProps} messages={messages} />);
    expect(screen.getByRole("button", { name: "Copy to clipboard" })).toBeInTheDocument();
  });

  it("writes message content to clipboard on copy click", async () => {
    const content = "Copy this text";
    const messages = [makeMessage({ id: "1", content })];
    render(<ChatPanel {...baseProps} messages={messages} />);
    await userEvent.click(screen.getByRole("button", { name: "Copy to clipboard" }));
    expect(writeTextMock).toHaveBeenCalledWith(content);
  });

  it("shows Copied confirmation state after click", async () => {
    const messages = [makeMessage({ id: "1" })];
    render(<ChatPanel {...baseProps} messages={messages} />);
    await act(async () => {
      await userEvent.click(screen.getByRole("button", { name: "Copy to clipboard" }));
    });
    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Copied" })).toBeInTheDocument();
    });
  });
});

// ─── Export conversation ──────────────────────────────────────────────────────

describe("Export conversation", () => {
  it("shows export button when messages exist", () => {
    const messages = [makeMessage()];
    render(<ChatPanel {...baseProps} messages={messages} />);
    expect(
      screen.getByRole("button", { name: "Export conversation as markdown" })
    ).toBeInTheDocument();
  });

  it("hides export button when no messages", () => {
    render(<ChatPanel {...baseProps} />);
    expect(
      screen.queryByRole("button", { name: "Export conversation as markdown" })
    ).not.toBeInTheDocument();
  });

  it("triggers file download on export click", async () => {
    // Intercept the anchor click without mocking createElement (avoids circular mock issue)
    const clickSpy = vi.fn();
    // eslint-disable-next-line @typescript-eslint/no-deprecated
    const originalCreateElement = document.createElement.bind(document);
    vi.spyOn(document, "createElement").mockImplementation((tag: string) => {
      const el = originalCreateElement(tag as keyof HTMLElementTagNameMap);
      if (tag === "a") el.click = clickSpy;
      return el;
    });

    const messages = [makeMessage({ content: "Hello world" })];
    render(<ChatPanel {...baseProps} messages={messages} />);
    await userEvent.click(screen.getByRole("button", { name: "Export conversation as markdown" }));

    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(URL.createObjectURL).toHaveBeenCalled();
    expect(clickSpy).toHaveBeenCalled();
  });
});

// ─── Message timestamps ───────────────────────────────────────────────────────

describe("Message timestamps", () => {
  it("renders timestamp below each message", () => {
    const ts = new Date("2024-06-15T14:30:00Z").getTime();
    const messages = [makeMessage({ id: "1", timestamp: ts })];
    render(<ChatPanel {...baseProps} messages={messages} />);
    // Check for time pattern HH:MM (locale-agnostic)
    const timePattern = /\d{1,2}:\d{2}/;
    expect(screen.getAllByText(timePattern).length).toBeGreaterThan(0);
  });
});

// ─── Hint prompt search ───────────────────────────────────────────────────────

describe("Hint prompt search filter", () => {
  it("renders search input in empty state with a mode", () => {
    render(<ChatPanel {...baseProps} mode="form" />);
    expect(screen.getByPlaceholderText("Filter prompts...")).toBeInTheDocument();
  });

  it("filters prompts by keyword", async () => {
    render(<ChatPanel {...baseProps} mode="form" />);
    const search = screen.getByPlaceholderText("Filter prompts...");
    await userEvent.type(search, "Zod validation");

    // Should show prompts matching "Zod validation"
    const zodPrompts = screen.getAllByRole("button", { name: /Zod/i });
    expect(zodPrompts.length).toBeGreaterThan(0);
  });

  it("shows 'No matching prompts.' when filter matches nothing", async () => {
    render(<ChatPanel {...baseProps} mode="form" />);
    const search = screen.getByPlaceholderText("Filter prompts...");
    await userEvent.type(search, "xyzzy_nonexistent_12345");
    expect(screen.getByText("No matching prompts.")).toBeInTheDocument();
  });
});

// ─── Show more / show less ────────────────────────────────────────────────────

describe("Show more / show less", () => {
  it("initially shows at most 6 prompts (INITIAL_PROMPT_COUNT)", () => {
    render(<ChatPanel {...baseProps} mode="form" />);
    // Each prompt is a button (excluding the search input's label)
    const promptButtons = screen
      .getAllByRole("button")
      .filter((btn) => btn.classList.contains("rounded-lg"));
    expect(promptButtons.length).toBeLessThanOrEqual(6);
  });

  it("shows 'Show X more' button when prompts exceed initial count", () => {
    render(<ChatPanel {...baseProps} mode="form" />);
    // form mode has 18 prompts > 6
    expect(screen.getByText(/Show .+ more/)).toBeInTheDocument();
  });

  it("expands to show all prompts on 'Show more' click", async () => {
    render(<ChatPanel {...baseProps} mode="chat" />);
    const showMoreBtn = screen.getByText(/Show .+ more/);
    await userEvent.click(showMoreBtn);
    expect(screen.getByText("Show less")).toBeInTheDocument();
  });

  it("collapses back on 'Show less' click", async () => {
    render(<ChatPanel {...baseProps} mode="form" />);
    await userEvent.click(screen.getByText(/Show .+ more/));
    await userEvent.click(screen.getByText("Show less"));
    expect(screen.getByText(/Show .+ more/)).toBeInTheDocument();
  });
});

// ─── Color swatches in assistant messages ─────────────────────────────────────

describe("Hex color swatches in assistant messages", () => {
  it("renders a color swatch for hex codes in assistant message content", () => {
    const messages = [
      makeMessage({
        id: "1",
        role: "assistant",
        content: "Here is a blue color: #0066ff and red: #ff0000",
        timestamp: NOW,
      }),
    ];
    render(<ChatPanel {...baseProps} messages={messages} />);
    // Hex codes should appear as code elements
    expect(screen.getByText("#0066ff")).toBeInTheDocument();
    expect(screen.getByText("#ff0000")).toBeInTheDocument();
  });

  it("renders color swatch spans with background-color style", () => {
    const messages = [
      makeMessage({
        id: "1",
        role: "assistant",
        content: "Primary: #1a2b3c",
        timestamp: NOW,
      }),
    ];
    const { container } = render(<ChatPanel {...baseProps} messages={messages} />);
    const swatch = container.querySelector('[style*="background-color"]');
    expect(swatch).toBeInTheDocument();
  });
});

// ─── Mermaid code block rendering ─────────────────────────────────────────────

describe("Mermaid code block in assistant messages", () => {
  it("renders mermaid fenced code block as a diagram container", async () => {
    const mermaidContent = "```mermaid\ngraph TD; A-->B\n```";
    const messages = [
      makeMessage({
        id: "1",
        role: "assistant",
        content: mermaidContent,
        timestamp: NOW,
      }),
    ];
    const { container } = render(<ChatPanel {...baseProps} messages={messages} />);
    await waitFor(() => {
      expect(container.querySelector("svg")).toBeInTheDocument();
    });
  });
});

// ─── ThinkingIndicator timers ─────────────────────────────────────────────────

describe("ThinkingIndicator elapsed time", () => {
  it("shows phase elapsed time while thinking", () => {
    render(<ChatPanel {...baseProps} isLoading={true} status="submitted" />);
    expect(screen.getByText(/0s/)).toBeInTheDocument();
  });
});
