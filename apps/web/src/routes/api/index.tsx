import { createFileRoute } from "@tanstack/react-router";
import { ApiSchemaBuilderPanel } from "@/modules/api-schema-builder";

export const Route = createFileRoute("/api/")({
  component: ApiSchemaPage,
});

function ApiSchemaPage() {
  return <ApiSchemaBuilderPanel />;
}
