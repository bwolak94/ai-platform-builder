import { createFileRoute } from "@tanstack/react-router";
import { EmptyState } from "@/ui";

export const Route = createFileRoute("/layout/")({
  component: LayoutBuilderPage,
});

function LayoutBuilderPage() {
  return (
    <EmptyState
      title="Layout Builder"
      description="Describe the page layout you want to create and the agent will build it for you."
    />
  );
}
