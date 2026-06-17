import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  generateOpenApiJson,
  serializeApiDSL,
  generatePostmanCollection,
  generateTypeScriptSDK,
  generateCurlScript,
  generatePythonSDK,
} from "@ai-builder/serializers";
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

export function ExportPanel({ spec }: ExportPanelProps) {
  const slug = spec.title.toLowerCase().replace(/\s+/g, "-");

  return (
    <div className="space-y-2">
      <p className="text-muted-foreground text-xs font-medium">Export as:</p>
      <div className="flex flex-wrap gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            downloadFile(
              JSON.stringify(generateOpenApiJson(spec), null, 2),
              slug + ".openapi.json",
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
            downloadFile(yamlDump(generateOpenApiJson(spec)), slug + ".openapi.yaml", "text/yaml");
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
            downloadFile(serializeApiDSL(spec), slug + ".api.dsl", "text/plain");
          }}
        >
          <Download className="mr-1.5 h-3.5 w-3.5" /> DSL
        </Button>

        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            downloadFile(generateTypeScriptSDK(spec), slug + ".sdk.ts", "text/typescript");
          }}
        >
          <Download className="mr-1.5 h-3.5 w-3.5" /> TypeScript SDK
        </Button>

        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            downloadFile(generateCurlScript(spec), slug + ".sh", "text/x-sh");
          }}
        >
          <Download className="mr-1.5 h-3.5 w-3.5" /> cURL Script
        </Button>

        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            downloadFile(generatePythonSDK(spec), slug + "_sdk.py", "text/x-python");
          }}
        >
          <Download className="mr-1.5 h-3.5 w-3.5" /> Python SDK
        </Button>
      </div>
    </div>
  );
}
