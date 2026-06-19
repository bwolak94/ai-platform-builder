import { createFileRoute } from "@tanstack/react-router";
import { WordPressBuilderPanel } from "@/modules/wordpress-builder";

export const Route = createFileRoute("/wordpress/")({
  component: WordPressBuilderPage,
});

function WordPressBuilderPage() {
  return <WordPressBuilderPanel />;
}
