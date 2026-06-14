import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { ToolCallStatus } from "./ToolCallStatus";

describe("ToolCallStatus", () => {
  it("renders nothing when toolName is null", () => {
    const { container } = render(<ToolCallStatus toolName={null} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("displays the tool name when provided", () => {
    render(<ToolCallStatus toolName="generateForm" />);
    expect(screen.getByText("Running tool: generateForm")).toBeInTheDocument();
  });
});
