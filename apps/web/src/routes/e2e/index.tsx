import { createFileRoute } from "@tanstack/react-router";
import { EmptyState } from "@/ui";

export const Route = createFileRoute("/e2e/")({
  component: E2eTestPage,
});

function E2eTestPage() {
  return (
    <EmptyState
      title="E2E Test Generator"
      description="Describe your user flows and the agent will generate Playwright tests."
    />
  );
}
