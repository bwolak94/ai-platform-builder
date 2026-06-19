import { createFileRoute } from "@tanstack/react-router";
import { GeneralChatPanel } from "@/modules/general-chat";

export const Route = createFileRoute("/chat/")({
  component: GeneralChatPage,
});

function GeneralChatPage() {
  return <GeneralChatPanel />;
}
