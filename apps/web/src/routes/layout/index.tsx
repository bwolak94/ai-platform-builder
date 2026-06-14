import { createFileRoute } from "@tanstack/react-router";
import { LayoutBuilderPanel } from "@/modules/layout-builder";

export const Route = createFileRoute("/layout/")({
  component: LayoutBuilderPage,
});

function LayoutBuilderPage() {
  return (
    <div className="h-full p-4">
      <LayoutBuilderPanel />
    </div>
  );
}
