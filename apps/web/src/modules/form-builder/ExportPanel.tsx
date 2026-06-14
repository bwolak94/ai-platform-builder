import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import type { FormSchema, FormField } from "@ai-builder/schemas";

interface ExportPanelProps {
  schema: FormSchema;
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

function generateReactTSX(schema: FormSchema): string {
  const fields = schema.fields
    .map((f) => {
      const validationAttrs = (f.validation ?? [])
        .map((r) => {
          if (r.type === "required") return `required: true`;
          if (r.type === "minLength")
            return `minLength: { value: ${String(r.value)}, message: "${r.message}" }`;
          if (r.type === "maxLength")
            return `maxLength: { value: ${String(r.value)}, message: "${r.message}" }`;
          if (r.type === "pattern")
            return `pattern: { value: /${String(r.value)}/, message: "${r.message}" }`;
          return "";
        })
        .filter(Boolean);

      const rules = validationAttrs.length > 0 ? `{ ${validationAttrs.join(", ")} }` : "{}";

      return `      <div>
        <label htmlFor="${f.id}">${f.label}</label>
        <input
          id="${f.id}"
          type="${f.type}"
          placeholder="${f.placeholder ?? ""}"
          {...register("${f.name}", ${rules})}
        />
        {errors.${f.name} && <span>{errors.${f.name}?.message}</span>}
      </div>`;
    })
    .join("\n");

  return `import { useForm } from "react-hook-form";

interface ${schema.title.replace(/\s+/g, "")}Data {
${schema.fields.map((f: FormField) => `  ${f.name}: string;`).join("\n")}
}

export function ${schema.title.replace(/\s+/g, "")}Form() {
  const { register, handleSubmit, formState: { errors } } = useForm<${schema.title.replace(/\s+/g, "")}Data>();

  function onSubmit(data: ${schema.title.replace(/\s+/g, "")}Data) {
    console.log(data);
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
${fields}
      <button type="submit">${schema.submitLabel ?? "Submit"}</button>
    </form>
  );
}
`;
}

function generateHTML(schema: FormSchema): string {
  const fields = schema.fields
    .map((f) => {
      const required = (f.validation ?? []).some((r) => r.type === "required") ? " required" : "";
      const minLength = (f.validation ?? []).find((r) => r.type === "minLength");
      const maxLength = (f.validation ?? []).find((r) => r.type === "maxLength");
      const min = (f.validation ?? []).find((r) => r.type === "min");
      const max = (f.validation ?? []).find((r) => r.type === "max");
      const pattern = (f.validation ?? []).find((r) => r.type === "pattern");

      const attrs = [
        required,
        minLength ? ` minlength="${String(minLength.value)}"` : "",
        maxLength ? ` maxlength="${String(maxLength.value)}"` : "",
        min ? ` min="${String(min.value)}"` : "",
        max ? ` max="${String(max.value)}"` : "",
        pattern ? ` pattern="${String(pattern.value)}"` : "",
        f.placeholder ? ` placeholder="${f.placeholder}"` : "",
      ].join("");

      if (f.type === "textarea") {
        return `  <div>
    <label for="${f.id}">${f.label}</label>
    <textarea id="${f.id}" name="${f.name}"${attrs}></textarea>
  </div>`;
      }
      if (f.type === "select") {
        const opts = (f.options ?? [])
          .map((o) => `      <option value="${o.value}">${o.label}</option>`)
          .join("\n");
        return `  <div>
    <label for="${f.id}">${f.label}</label>
    <select id="${f.id}" name="${f.name}"${attrs}>
${opts}
    </select>
  </div>`;
      }
      return `  <div>
    <label for="${f.id}">${f.label}</label>
    <input type="${f.type}" id="${f.id}" name="${f.name}"${attrs} />
  </div>`;
    })
    .join("\n");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>${schema.title}</title>
</head>
<body>
  <form>
    <h2>${schema.title}</h2>
${fields}
    <button type="submit">${schema.submitLabel ?? "Submit"}</button>
  </form>
</body>
</html>
`;
}

export function ExportPanel({ schema }: ExportPanelProps) {
  const slug = schema.title.toLowerCase().replace(/\s+/g, "-");

  return (
    <div className="space-y-3">
      <p className="text-muted-foreground text-xs">Export form as:</p>
      <div className="flex flex-wrap gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            downloadFile(JSON.stringify(schema, null, 2), `${slug}.json`, "application/json");
          }}
        >
          <Download className="mr-1.5 h-3.5 w-3.5" /> JSON Schema
        </Button>

        <Separator orientation="vertical" className="h-8" />

        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            downloadFile(generateReactTSX(schema), `${slug}.tsx`, "text/plain");
          }}
        >
          <Download className="mr-1.5 h-3.5 w-3.5" /> React TSX
        </Button>

        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            downloadFile(generateHTML(schema), `${slug}.html`, "text/html");
          }}
        >
          <Download className="mr-1.5 h-3.5 w-3.5" /> HTML
        </Button>
      </div>
    </div>
  );
}
