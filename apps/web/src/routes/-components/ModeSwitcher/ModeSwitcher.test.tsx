import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ModeSwitcher } from "./ModeSwitcher";
import { BUILDER_MODES } from "@/utils";

describe("ModeSwitcher", () => {
  it("renders all mode buttons", () => {
    render(<ModeSwitcher currentMode="form" onModeChange={vi.fn()} />);
    BUILDER_MODES.forEach((mode) => {
      expect(screen.getByRole("button", { name: mode.label })).toBeInTheDocument();
    });
  });

  it("applies active styles to the current mode button", () => {
    render(<ModeSwitcher currentMode="layout" onModeChange={vi.fn()} />);
    const activeBtn = screen.getByRole("button", { name: "Layout Builder" });
    expect(activeBtn.className).toContain("bg-primary");
  });

  it("calls onModeChange with the selected mode id", async () => {
    const onModeChange = vi.fn();
    render(<ModeSwitcher currentMode="form" onModeChange={onModeChange} />);
    await userEvent.click(screen.getByRole("button", { name: "API Schema" }));
    expect(onModeChange).toHaveBeenCalledWith("api");
  });
});
