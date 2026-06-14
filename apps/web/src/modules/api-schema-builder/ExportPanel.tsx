import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { generateOpenApiJson, serializeApiDSL } from "@ai-builder/serializers";
import type { OpenApiSpec } from "@ai-builder/schemas";
import { dump as yamlDump } from "js-yaml";

interface ExportPanelProps {
  spec: OpenApiSpec;
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

function generatePostmanCollection(spec: OpenApiSpec): string {
  const items = spec.endpoints.map((ep) => ({
    name: ep.summary ?? ep.method + " " + ep.path,
    request: {
      method: ep.method,
      url: { raw: (spec.baseUrl ?? "http://localhost") + ep.path },
      header: [],
    },
  }));
  const collection = {
    info: {
      name: spec.title,
      schema: "https://schema.getpostman.com/json/collection/v2.1.0/collection.json",
    },
    item: items,
  };
  return JSON.stringify(collection, null, 2);
}

export function ExportPanel({ spec }: ExportPanelProps) {
  const slug = spec.title.toLowerCase().replace(/\s+/g, "-");

  return (
    <div className="space-y-2">
      <p className="text-muted-foreground text-xs">Export as:</p>
      <div className="flex flex-wrap gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            downloadFile(
              JSON.stringify(generateOpenApiJson(spec), null, 2),
              slug + ".json",
              "application/json"
            );
          }}
        >
          <Download className="mr-1.5 h-3.5 w-3.5" /> OpenAPI JSON
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            downloadFile(yamlDump(generateOpenApiJson(spec)), slug + ".yaml", "text/yaml");
          }}
        >
          <Download className="mr-1.5 h-3.5 w-3.5" /> OpenAPI YAML
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            downloadFile(
              generatePostmanCollection(spec),
              slug + ".postman.json",
              "application/json"
            );
          }}
        >
          <Download className="mr-1.5 h-3.5 w-3.5" /> Postman
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            downloadFile(serializeApiDSL(spec), slug + ".dsl.txt", "text/plain");
          }}
        >
          <Download className="mr-1.5 h-3.5 w-3.5" /> DSL
        </Button>
      </div>
    </div>
  );
}
