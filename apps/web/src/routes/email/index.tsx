import { createFileRoute } from "@tanstack/react-router";
import { EmptyState } from "@/ui";

export const Route = createFileRoute("/email/")({
  component: EmailTemplatePage,
});

function EmailTemplatePage() {
  return (
    <EmptyState
      title="Email Template Builder"
      description="Describe your email template and the agent will generate it for you."
    />
  );
}
