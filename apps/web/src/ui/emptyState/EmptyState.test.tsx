import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { EmptyState } from "./EmptyState";

describe("EmptyState", () => {
  it("renders the title", () => {
    render(<EmptyState title="Nothing here" />);
    expect(screen.getByText("Nothing here")).toBeInTheDocument();
  });

  it("renders optional description", () => {
    render(<EmptyState title="Empty" description="Try adding something" />);
    expect(screen.getByText("Try adding something")).toBeInTheDocument();
  });

  it("does not render description when omitted", () => {
    render(<EmptyState title="Empty" />);
    expect(screen.queryByText("Try adding something")).not.toBeInTheDocument();
  });

  it("renders optional icon", () => {
    render(<EmptyState title="Empty" icon={<span data-testid="icon">★</span>} />);
    expect(screen.getByTestId("icon")).toBeInTheDocument();
  });
});
