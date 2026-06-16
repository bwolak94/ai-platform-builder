import { useState } from "react";
import { Download, Send, Loader2, CheckCircle2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { generateEmailHtml, serializeEmailDSL } from "@ai-builder/serializers";
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
  setTimeout(() => {
    URL.revokeObjectURL(url);
  }, 100);
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
        if (s.text) lines.push(s.text, "");
        lines.push(`${s.cta.label}: ${s.cta.url}`, "");
        break;
      case "footer":
        if (s.companyName) lines.push(s.companyName);
        if (s.address) lines.push(s.address);
        if (s.unsubscribeUrl) lines.push(`Unsubscribe: ${s.unsubscribeUrl}`);
        lines.push("");
        break;
      case "columns":
        for (const col of s.columns) {
          if (col.heading) lines.push(col.heading);
          if (col.body) lines.push(col.body, "");
        }
        break;
    }
  }
  return lines.join("\n");
}

type SendStatus = "idle" | "sending" | "success" | "error";

export function ExportPanel({ template }: ExportPanelProps) {
  const [sendDialogOpen, setSendDialogOpen] = useState(false);
  const [sendTo, setSendTo] = useState("");
  const [sendStatus, setSendStatus] = useState<SendStatus>("idle");
  const [sendError, setSendError] = useState<string | null>(null);

  const slug = template.subject
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);

  async function handleSendTest() {
    if (!sendTo.trim()) return;
    setSendStatus("sending");
    setSendError(null);

    try {
      const res = await fetch("/api/email/send-test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: sendTo.trim(),
          html: generateEmailHtml(template),
          subject: `[TEST] ${template.subject}`,
        }),
      });

      if (res.ok) {
        setSendStatus("success");
        setTimeout(() => {
          setSendStatus("idle");
          setSendDialogOpen(false);
          setSendTo("");
        }, 2000);
      } else {
        const data = (await res.json()) as { error?: string };
        setSendError(data.error ?? "Failed to send email");
        setSendStatus("error");
      }
    } catch {
      setSendError("Network error — is the worker running?");
      setSendStatus("error");
    }
  }

  return (
    <div className="space-y-2">
      <p className="text-muted-foreground text-xs">Export as:</p>
      <div className="flex flex-wrap gap-1.5">
        <Button
          variant="outline"
          size="sm"
          className="h-7 text-xs"
          onClick={() => {
            downloadFile(generateEmailHtml(template), slug + ".html", "text/html");
          }}
        >
          <Download className="mr-1 h-3 w-3" /> HTML
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="h-7 text-xs"
          onClick={() => {
            downloadFile(generatePlainText(template), slug + ".txt", "text/plain");
          }}
        >
          <Download className="mr-1 h-3 w-3" /> Plain text
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="h-7 text-xs"
          onClick={() => {
            downloadFile(serializeEmailDSL(template), slug + ".dsl.txt", "text/plain");
          }}
        >
          <Download className="mr-1 h-3 w-3" /> DSL
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="h-7 text-xs"
          onClick={() => {
            downloadFile(JSON.stringify(template, null, 2), slug + ".json", "application/json");
          }}
        >
          <Download className="mr-1 h-3 w-3" /> JSON
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="h-7 text-xs"
          onClick={() => {
            setSendDialogOpen(true);
          }}
        >
          <Send className="mr-1 h-3 w-3" /> Send test
        </Button>
      </div>

      <Dialog
        open={sendDialogOpen}
        onOpenChange={(open) => {
          if (!open) {
            setSendStatus("idle");
            setSendError(null);
          }
          setSendDialogOpen(open);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Send test email</DialogTitle>
            <DialogDescription>
              Send the current template to an email address to see how it looks in a real inbox.
              Requires <code className="text-xs">RESEND_API_KEY</code> to be set in the worker.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2 py-2">
            <Label htmlFor="send-test-email" className="text-xs">
              Send to
            </Label>
            <Input
              id="send-test-email"
              type="email"
              value={sendTo}
              onChange={(e) => {
                setSendTo(e.target.value);
              }}
              placeholder="you@example.com"
              disabled={sendStatus === "sending" || sendStatus === "success"}
              onKeyDown={(e) => {
                if (e.key === "Enter") void handleSendTest();
              }}
            />
            {sendStatus === "error" && sendError && (
              <p className="flex items-center gap-1 text-xs text-red-600">
                <XCircle className="h-3.5 w-3.5 shrink-0" />
                {sendError}
              </p>
            )}
            {sendStatus === "success" && (
              <p className="flex items-center gap-1 text-xs text-green-600">
                <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                Email sent! Check your inbox.
              </p>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setSendDialogOpen(false);
              }}
              disabled={sendStatus === "sending"}
            >
              Cancel
            </Button>
            <Button
              onClick={() => {
                void handleSendTest();
              }}
              disabled={!sendTo.trim() || sendStatus === "sending" || sendStatus === "success"}
            >
              {sendStatus === "sending" ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sending…
                </>
              ) : (
                <>
                  <Send className="mr-2 h-4 w-4" />
                  Send
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
