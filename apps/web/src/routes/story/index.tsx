import { createFileRoute } from "@tanstack/react-router";
import { ComponentStoryBuilderPanel } from "@/modules/component-story-builder";

export const Route = createFileRoute("/story/")({
  component: ComponentStoryPage,
});

function ComponentStoryPage() {
  return (
    <div className="h-full p-4">
      <ComponentStoryBuilderPanel />
    </div>
  );
}
