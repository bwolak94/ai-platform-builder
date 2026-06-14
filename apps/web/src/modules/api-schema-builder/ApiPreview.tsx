import { useMemo } from "react";
import { generateOpenApiJson } from "@ai-builder/serializers";
import type { OpenApiSpec } from "@ai-builder/schemas";

interface ApiPreviewProps {
  spec: OpenApiSpec;
}

function generatePreviewHtml(spec: OpenApiSpec): string {
  const openApiJson = JSON.stringify(generateOpenApiJson(spec));
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>${spec.title}</title>
  <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist/swagger-ui.css" />
</head>
<body>
<div id="swagger-ui"></div>
<script src="https://unpkg.com/swagger-ui-dist/swagger-ui-bundle.js"></script>
<script>
  SwaggerUIBundle({
    spec: ${openApiJson},
    dom_id: "#swagger-ui",
    deepLinking: true,
    presets: [SwaggerUIBundle.presets.apis, SwaggerUIBundle.SwaggerUIStandalonePreset],
    layout: "BaseLayout"
  });
</script>
</body>
</html>`;
}

export function ApiPreview({ spec }: ApiPreviewProps) {
  const srcDoc = useMemo(() => generatePreviewHtml(spec), [spec]);

  if (spec.endpoints.length === 0) {
    return (
      <div className="text-muted-foreground flex h-full items-center justify-center text-sm">
        Add endpoints to see the Swagger UI preview.
      </div>
    );
  }

  return (
    <iframe
      srcDoc={srcDoc}
      sandbox="allow-scripts"
      title="API Swagger UI preview"
      className="h-full w-full border-0"
    />
  );
}
