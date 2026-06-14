import { createFileRoute } from "@tanstack/react-router";
import { EmptyState } from "@/ui";

export const Route = createFileRoute("/api/")({
  component: ApiSchemaPage,
});

function ApiSchemaPage() {
  return (
    <EmptyState
      title="API Schema Builder"
      description="Describe your API endpoints and the agent will generate an OpenAPI schema."
    />
  );
}
