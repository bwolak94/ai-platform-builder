import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  generateSqlMigration,
  generateMermaidErd,
  generatePrismaSchema,
} from "@ai-builder/serializers";
import type { DbSchema } from "@ai-builder/schemas";

interface ExportPanelProps {
  schema: DbSchema;
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

export function ExportPanel({ schema }: ExportPanelProps) {
  const slug = schema.name.replace(/_/g, "-");

  return (
    <div className="space-y-2">
      <p className="text-muted-foreground text-xs">Export as:</p>
      <div className="flex flex-wrap gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            downloadFile(generateSqlMigration(schema), slug + ".sql", "text/plain");
          }}
        >
          <Download className="mr-1.5 h-3.5 w-3.5" /> SQL Migration
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            downloadFile(generatePrismaSchema(schema), "schema.prisma", "text/plain");
          }}
        >
          <Download className="mr-1.5 h-3.5 w-3.5" /> Prisma Schema
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            downloadFile(generateMermaidErd(schema), slug + ".mmd", "text/plain");
          }}
        >
          <Download className="mr-1.5 h-3.5 w-3.5" /> Mermaid ERD
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            downloadFile(JSON.stringify(schema, null, 2), slug + ".json", "application/json");
          }}
        >
          <Download className="mr-1.5 h-3.5 w-3.5" /> JSON
        </Button>
      </div>
    </div>
  );
}
