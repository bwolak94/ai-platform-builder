import { createFileRoute } from "@tanstack/react-router";
import { FormBuilderPanel } from "@/modules/form-builder";

export const Route = createFileRoute("/form/")({
  component: FormBuilderPage,
});

function FormBuilderPage() {
  return <FormBuilderPanel />;
}
