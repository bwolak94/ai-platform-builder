import { useMemo } from "react";
import { Monitor, Smartphone, AppWindow, Moon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { generateEmailHtml } from "@ai-builder/serializers";
import type { EmailTemplate } from "@ai-builder/schemas";
import type { ClientMode } from "./hooks/useEmailState";

interface EmailPreviewProps {
  template: EmailTemplate;
  clientMode: ClientMode;
  onClientModeChange: (mode: ClientMode) => void;
}

const CLIENT_MODES: {
  mode: ClientMode;
  label: string;
  width: string;
  Icon: React.ComponentType<{ className?: string }>;
}[] = [
  { mode: "desktop", label: "Desktop", width: "100%", Icon: Monitor },
  { mode: "mobile", label: "Mobile", width: "375px", Icon: Smartphone },
  { mode: "outlook", label: "Outlook", width: "600px", Icon: AppWindow },
  { mode: "dark", label: "Dark", width: "100%", Icon: Moon },
];

function generateDarkModeHtml(html: string): string {
  const darkCss = `
    <style>
      body, table, td { background-color: #1a1a1a !important; color: #e5e5e5 !important; }
      h1, h2, h3, p, span { color: #e5e5e5 !important; }
      a:not([style*="background"]) { color: #818cf8 !important; }
      img { opacity: 0.9; }
    </style>`;
  return html.replace("</head>", darkCss + "</head>");
}

export function EmailPreview({ template, clientMode, onClientModeChange }: EmailPreviewProps) {
  const html = useMemo(() => {
    const base = generateEmailHtml(template);
    return clientMode === "dark" ? generateDarkModeHtml(base) : base;
  }, [template, clientMode]);

  if (template.sections.length === 0) {
    return (
      <div className="flex h-full flex-col">
        <div className="flex items-center justify-center gap-1 pb-2">
          {CLIENT_MODES.map(({ mode, label, Icon }) => (
            <Button
              key={mode}
              variant={clientMode === mode ? "secondary" : "ghost"}
              size="icon"
              className="h-7 w-7"
              onClick={() => {
                onClientModeChange(mode);
              }}
              title={label}
              aria-pressed={clientMode === mode}
            >
              <Icon className="h-3.5 w-3.5" />
            </Button>
          ))}
        </div>
        <div className="text-muted-foreground flex flex-1 items-center justify-center text-sm">
          Add sections to see the email preview.
        </div>
      </div>
    );
  }

  const currentConfig = CLIENT_MODES.find((c) => c.mode === clientMode) ?? {
    label: "Desktop",
    width: "100%",
    mode: "desktop" as const,
    Icon: Monitor,
  };

  return (
    <div className="flex h-full flex-col gap-2">
      {/* Client mode toolbar */}
      <div className="flex items-center justify-center gap-1">
        {CLIENT_MODES.map(({ mode, label, Icon }) => (
          <Button
            key={mode}
            variant={clientMode === mode ? "secondary" : "ghost"}
            size="icon"
            className="h-7 w-7"
            onClick={() => {
              onClientModeChange(mode);
            }}
            title={label}
            aria-pressed={clientMode === mode}
          >
            <Icon className="h-3.5 w-3.5" />
          </Button>
        ))}
        <span className="text-muted-foreground ml-2 text-xs">
          {currentConfig.label}
          {currentConfig.width !== "100%" ? ` · ${currentConfig.width}` : ""}
        </span>
      </div>

      {/* Preview frame */}
      <div
        className={[
          "relative flex-1 overflow-auto",
          clientMode !== "desktop" && clientMode !== "dark" ? "flex justify-center" : "",
        ]
          .filter(Boolean)
          .join(" ")}
      >
        <iframe
          srcDoc={html}
          sandbox="allow-scripts"
          title={`Email preview — ${currentConfig.label}`}
          className="h-full border-0"
          style={{
            width: currentConfig.width,
            minHeight: "500px",
            background: clientMode === "dark" ? "#1a1a1a" : "#f4f4f4",
          }}
          aria-label="Live email preview"
        />
      </div>
    </div>
  );
}
