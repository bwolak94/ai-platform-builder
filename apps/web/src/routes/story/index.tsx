import { createFileRoute } from "@tanstack/react-router";
import { EmptyState } from "@/ui";

export const Route = createFileRoute("/story/")({
  component: ComponentStoryPage,
});

function ComponentStoryPage() {
  return (
    <EmptyState
      title="Component Story Builder"
      description="Describe your component and the agent will generate Storybook stories."
    />
  );
}
