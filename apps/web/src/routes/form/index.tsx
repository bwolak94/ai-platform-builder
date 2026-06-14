import { createFileRoute } from "@tanstack/react-router";
import { EmptyState } from "@/ui";

export const Route = createFileRoute("/form/")({
  component: FormBuilderPage,
});

function FormBuilderPage() {
  return (
    <EmptyState
      title="Form Builder"
      description="Describe the form you want to create and the agent will build it for you."
    />
  );
}
