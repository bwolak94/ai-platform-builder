import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { generateEmailHtml } from "@ai-builder/serializers";
import type { EmailTemplate } from "@ai-builder/schemas";

interface ExportPanelProps {
  template: EmailTemplate;
}

function downloadFile(content: string, filename: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function generatePlainText(template: EmailTemplate): string {
  const lines: string[] = [template.subject, ""];
  for (const s of template.sections) {
    switch (s.type) {
      case "hero":
        lines.push(s.heading, s.subheading ?? "", "");
        break;
      case "text":
        lines.push(s.content, "");
        break;
      case "cta":
        lines.push(s.cta.label + ": " + s.cta.url, "");
        break;
      case "footer":
        lines.push(
          s.companyName ?? "",
          s.unsubscribeUrl ? "Unsubscribe: " + s.unsubscribeUrl : "",
          ""
        );
        break;
    }
  }
  return lines.join("\n");
}

export function ExportPanel({ template }: ExportPanelProps) {
  const slug = template.subject.toLowerCase().replace(/\s+/g, "-").slice(0, 30);

  return (
    <div className="space-y-2">
      <p className="text-muted-foreground text-xs">Export as:</p>
      <div className="flex flex-wrap gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            downloadFile(generateEmailHtml(template), slug + ".html", "text/html");
          }}
        >
          <Download className="mr-1.5 h-3.5 w-3.5" /> HTML (inline CSS)
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            downloadFile(generatePlainText(template), slug + ".txt", "text/plain");
          }}
        >
          <Download className="mr-1.5 h-3.5 w-3.5" /> Plain text
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            downloadFile(JSON.stringify(template, null, 2), slug + ".json", "application/json");
          }}
        >
          <Download className="mr-1.5 h-3.5 w-3.5" /> JSON
        </Button>
      </div>
    </div>
  );
}
