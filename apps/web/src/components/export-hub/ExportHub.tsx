import { useState, useMemo, useCallback } from "react";
import { Download, Copy, Check, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { FormSchema } from "@ai-builder/schemas";
import {
  generateZodSchema,
  generateReactHookForm,
  generateFormikForm,
  generateHtml,
} from "@ai-builder/serializers";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ExportFormat {
  id: string;
  label: string;
  ext: string;
  mime: string;
  generate: () => string;
}

// ─── Code Block ──────────────────────────────────────────────────────────────

function CodeBlock({ code, filename, mime }: { code: string; filename: string; mime: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => {
      setCopied(false);
    }, 2000);
  }, [code]);

  function handleDownload() {
    const blob = new Blob([code], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="flex h-full flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-muted-foreground font-mono text-xs">{filename}</span>
        <div className="flex gap-1.5">
          <Button
            variant="outline"
            size="sm"
            className="h-7 gap-1.5 text-xs"
            onClick={() => void handleCopy()}
          >
            {copied ? (
              <>
                <Check className="h-3 w-3 text-green-500" />
                Copied
              </>
            ) : (
              <>
                <Copy className="h-3 w-3" />
                Copy
              </>
            )}
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-7 gap-1.5 text-xs"
            onClick={handleDownload}
          >
            <Download className="h-3 w-3" />
            Download
          </Button>
        </div>
      </div>

      <ScrollArea className="bg-muted/40 flex-1 rounded-md border">
        <pre className="whitespace-pre p-4 font-mono text-xs leading-relaxed">{code}</pre>
      </ScrollArea>
    </div>
  );
}

// ─── Export Hub ───────────────────────────────────────────────────────────────

interface ExportHubProps {
  schema: FormSchema;
}

export function ExportHub({ schema }: ExportHubProps) {
  const [activeTab, setActiveTab] = useState("json");
  // Track which tabs have been activated to avoid re-generating on every render
  const [activated, setActivated] = useState<Set<string>>(new Set(["json"]));

  const slug = schema.title.toLowerCase().replace(/\s+/g, "-");

  const formats = useMemo<ExportFormat[]>(
    () => [
      {
        id: "json",
        label: "JSON Schema",
        ext: "json",
        mime: "application/json",
        generate: () => JSON.stringify(schema, null, 2),
      },
      {
        id: "zod",
        label: "Zod",
        ext: "ts",
        mime: "text/plain",
        generate: () => generateZodSchema(schema),
      },
      {
        id: "rhf",
        label: "React Hook Form",
        ext: "tsx",
        mime: "text/plain",
        generate: () => generateReactHookForm(schema),
      },
      {
        id: "formik",
        label: "Formik",
        ext: "tsx",
        mime: "text/plain",
        generate: () => generateFormikForm(schema),
      },
      {
        id: "html",
        label: "HTML",
        ext: "html",
        mime: "text/html",
        generate: () => generateHtml(schema),
      },
    ],
    [schema]
  );

  function handleTabChange(id: string) {
    setActiveTab(id);
    setActivated((prev) => new Set([...prev, id]));
  }

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Package className="mr-1.5 h-3.5 w-3.5" />
          Export
        </Button>
      </DialogTrigger>

      <DialogContent className="flex h-[80vh] max-w-3xl flex-col gap-0 p-0">
        <DialogHeader className="border-b px-6 py-4">
          <DialogTitle className="text-base">Export — {schema.title}</DialogTitle>
        </DialogHeader>

        <Tabs
          value={activeTab}
          onValueChange={handleTabChange}
          className="flex min-h-0 flex-1 flex-col"
        >
          <TabsList className="mx-6 mb-2 mt-4 w-fit">
            {formats.map((f) => (
              <TabsTrigger key={f.id} value={f.id} className="text-xs">
                {f.label}
              </TabsTrigger>
            ))}
          </TabsList>

          <div className="min-h-0 flex-1 px-6 pb-6">
            {formats.map((f) => (
              <TabsContent key={f.id} value={f.id} className="mt-0 h-full">
                {activated.has(f.id) ? (
                  <CodeBlock code={f.generate()} filename={`${slug}.${f.ext}`} mime={f.mime} />
                ) : null}
              </TabsContent>
            ))}
          </div>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
