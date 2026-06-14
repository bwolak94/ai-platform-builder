import { createFileRoute } from "@tanstack/react-router";
import { E2eTestGeneratorPanel } from "@/modules/e2e-test-generator";

export const Route = createFileRoute("/e2e/")({
  component: E2eTestPage,
});

function E2eTestPage() {
  return (
    <div className="h-full p-4">
      <E2eTestGeneratorPanel />
    </div>
  );
}
