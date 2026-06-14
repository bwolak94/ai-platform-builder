import { createFileRoute } from "@tanstack/react-router";
import { EmptyState } from "@/ui";

export const Route = createFileRoute("/i18n/")({
  component: I18nManagerPage,
});

function I18nManagerPage() {
  return (
    <EmptyState
      title="i18n Manager"
      description="Manage your translation keys and the agent will help you generate translations."
    />
  );
}
