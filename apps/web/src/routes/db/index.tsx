import { createFileRoute } from "@tanstack/react-router";
import { EmptyState } from "@/ui";

export const Route = createFileRoute("/db/")({
  component: DbSchemaPage,
});

function DbSchemaPage() {
  return (
    <EmptyState
      title="DB Schema Builder"
      description="Describe your data model and the agent will generate a database schema."
    />
  );
}
