import { createFileRoute } from "@tanstack/react-router";
import { I18nManagerPanel } from "@/modules/i18n-manager";

export const Route = createFileRoute("/i18n/")({
  component: I18nManagerPage,
});

function I18nManagerPage() {
  return (
    <div className="h-full p-4">
      <I18nManagerPanel />
    </div>
  );
}
