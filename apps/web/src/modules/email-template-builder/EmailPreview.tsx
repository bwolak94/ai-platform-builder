import { useMemo } from "react";
import { generateEmailHtml } from "@ai-builder/serializers";
import type { EmailTemplate } from "@ai-builder/schemas";

type ClientMode = "desktop" | "mobile" | "outlook";

interface EmailPreviewProps {
  template: EmailTemplate;
  clientMode: ClientMode;
}

const CLIENT_WIDTHS: Record<ClientMode, string> = {
  desktop: "100%",
  mobile: "375px",
  outlook: "600px",
};

export function EmailPreview({ template, clientMode }: EmailPreviewProps) {
  const html = useMemo(() => generateEmailHtml(template), [template]);

  if (template.sections.length === 0) {
    return (
      <div className="text-muted-foreground flex h-full items-center justify-center text-sm">
        Add sections to see the email preview.
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col items-center overflow-auto bg-gray-100 p-4">
      <div
        style={{ width: CLIENT_WIDTHS[clientMode] }}
        className="h-full max-w-full overflow-auto rounded shadow-md"
      >
        <iframe
          srcDoc={html}
          sandbox="allow-scripts"
          title="Email preview"
          className="h-full w-full border-0"
          style={{ minHeight: "600px" }}
        />
      </div>
    </div>
  );
}
