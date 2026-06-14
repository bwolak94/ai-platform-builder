import { createFileRoute } from "@tanstack/react-router";
import { EmailBuilderPanel } from "@/modules/email-template-builder";

export const Route = createFileRoute("/email/")({
  component: EmailTemplatePage,
});

function EmailTemplatePage() {
  return (
    <div className="h-full p-4">
      <EmailBuilderPanel />
    </div>
  );
}
