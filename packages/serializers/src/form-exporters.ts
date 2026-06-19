import type { FormSchema, FormField, ValidationRule } from "@ai-builder/schemas";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function toPascalCase(str: string): string {
  return str
    .replace(/[^a-zA-Z0-9]+(.)/g, (_, chr: string) => chr.toUpperCase())
    .replace(/^(.)/, (c) => c.toUpperCase());
}

function buildValidationAttrs(rules: ValidationRule[] | null): string {
  if (!rules?.length) return "{}";
  const parts = rules
    .map((r) => {
      if (r.type === "required") return `required: true`;
      if (r.type === "minLength")
        return `minLength: { value: ${String(r.value)}, message: "${r.message}" }`;
      if (r.type === "maxLength")
        return `maxLength: { value: ${String(r.value)}, message: "${r.message}" }`;
      if (r.type === "pattern")
        return `pattern: { value: /${String(r.value)}/, message: "${r.message}" }`;
      if (r.type === "min") return `min: { value: ${String(r.value)}, message: "${r.message}" }`;
      if (r.type === "max") return `max: { value: ${String(r.value)}, message: "${r.message}" }`;
      return null;
    })
    .filter(Boolean);
  return `{ ${parts.join(", ")} }`;
}

function isRequired(field: FormField): boolean {
  return (field.validation ?? []).some((r) => r.type === "required");
}

// ─── Zod Schema ──────────────────────────────────────────────────────────────

function zodTypeFor(field: FormField): string {
  let base: string;

  switch (field.type) {
    case "email":
      base = 'z.string().email("Invalid email address")';
      break;
    case "number":
      base = "z.coerce.number()";
      break;
    case "checkbox":
      base = "z.boolean()";
      break;
    case "date":
      base = "z.string().date()";
      break;
    case "select":
    case "radio":
      if (field.options?.length) {
        const opts = field.options.map((o) => `"${o.value}"`).join(", ");
        base = `z.enum([${opts}])`;
      } else {
        base = "z.string()";
      }
      break;
    case "multiselect":
      if (field.options?.length) {
        const opts = field.options.map((o) => `"${o.value}"`).join(", ");
        base = `z.array(z.enum([${opts}]))`;
      } else {
        base = "z.array(z.string())";
      }
      break;
    default:
      base = "z.string()";
  }

  for (const rule of field.validation ?? []) {
    if (rule.type === "minLength") base += `.min(${String(rule.value)}, "${rule.message}")`;
    if (rule.type === "maxLength") base += `.max(${String(rule.value)}, "${rule.message}")`;
    if (rule.type === "pattern") base += `.regex(/${String(rule.value)}/, "${rule.message}")`;
    if (rule.type === "min" && field.type === "number")
      base += `.min(${String(rule.value)}, "${rule.message}")`;
    if (rule.type === "max" && field.type === "number")
      base += `.max(${String(rule.value)}, "${rule.message}")`;
  }

  if (!isRequired(field)) base += ".optional()";

  return base;
}

export function generateZodSchema(schema: FormSchema): string {
  const schemaName = `${toPascalCase(schema.title)}Schema`;
  const typeName = toPascalCase(schema.title);
  const fields = schema.fields.map((f) => `  ${f.name}: ${zodTypeFor(f)},`).join("\n");

  return `import { z } from "zod";

export const ${schemaName} = z.object({
${fields}
});

export type ${typeName} = z.infer<typeof ${schemaName}>;
`;
}

// ─── React Hook Form TSX ─────────────────────────────────────────────────────

export function generateReactHookForm(schema: FormSchema): string {
  const componentName = `${toPascalCase(schema.title)}Form`;
  const dataType = toPascalCase(schema.title);
  const schemaName = `${dataType}Schema`;

  const imports = [
    `import { useForm } from "react-hook-form";`,
    `import { zodResolver } from "@hookform/resolvers/zod";`,
    `import { z } from "zod";`,
  ].join("\n");

  const zodFields = schema.fields.map((f) => `  ${f.name}: ${zodTypeFor(f)},`).join("\n");
  const zodSchema = `const ${schemaName} = z.object({\n${zodFields}\n});\n\ntype ${dataType} = z.infer<typeof ${schemaName}>;`;

  const fieldJsx = schema.fields
    .map((f) => {
      const rules = buildValidationAttrs(f.validation);
      const placeholder = f.placeholder ? ` placeholder="${f.placeholder}"` : "";
      if (f.type === "textarea") {
        return `      <div className="space-y-1">
        <label htmlFor="${f.id}" className="text-sm font-medium">${f.label}</label>
        <textarea
          id="${f.id}"
          className="w-full rounded-md border px-3 py-2 text-sm"${placeholder}
          {...register("${f.name}", ${rules})}
        />
        {errors.${f.name} && <p className="text-sm text-red-500">{errors.${f.name}?.message}</p>}
      </div>`;
      }
      if (f.type === "select" && f.options) {
        const opts = f.options
          .map((o) => `          <option value="${o.value}">${o.label}</option>`)
          .join("\n");
        return `      <div className="space-y-1">
        <label htmlFor="${f.id}" className="text-sm font-medium">${f.label}</label>
        <select id="${f.id}" className="w-full rounded-md border px-3 py-2 text-sm" {...register("${f.name}", ${rules})}>
${opts}
        </select>
        {errors.${f.name} && <p className="text-sm text-red-500">{errors.${f.name}?.message}</p>}
      </div>`;
      }
      if (f.type === "checkbox") {
        return `      <div className="flex items-center gap-2">
        <input id="${f.id}" type="checkbox" {...register("${f.name}", ${rules})} />
        <label htmlFor="${f.id}" className="text-sm font-medium">${f.label}</label>
        {errors.${f.name} && <p className="text-sm text-red-500">{errors.${f.name}?.message}</p>}
      </div>`;
      }
      return `      <div className="space-y-1">
        <label htmlFor="${f.id}" className="text-sm font-medium">${f.label}</label>
        <input
          id="${f.id}"
          type="${f.type}"
          className="w-full rounded-md border px-3 py-2 text-sm"${placeholder}
          {...register("${f.name}", ${rules})}
        />
        {errors.${f.name} && <p className="text-sm text-red-500">{errors.${f.name}?.message}</p>}
      </div>`;
    })
    .join("\n\n");

  return `${imports}

${zodSchema}

export function ${componentName}() {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<${dataType}>({ resolver: zodResolver(${schemaName}) });

  async function onSubmit(data: ${dataType}) {
    // TODO: replace with your API call
    console.log(data);
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
${fieldJsx}

      <button
        type="submit"
        disabled={isSubmitting}
        className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
      >
        {isSubmitting ? "Submitting..." : "${schema.submitLabel ?? "Submit"}"}
      </button>
    </form>
  );
}
`;
}

// ─── Formik TSX ──────────────────────────────────────────────────────────────

export function generateFormikForm(schema: FormSchema): string {
  const componentName = `${toPascalCase(schema.title)}Form`;
  const dataType = toPascalCase(schema.title);

  const initialValues = schema.fields
    .map((f) => {
      if (f.type === "checkbox") return `    ${f.name}: false,`;
      if (f.type === "number") return `    ${f.name}: 0,`;
      return `    ${f.name}: "",`;
    })
    .join("\n");

  const typeFields = schema.fields
    .map((f) => {
      if (f.type === "checkbox") return `  ${f.name}: boolean;`;
      if (f.type === "number") return `  ${f.name}: number;`;
      return `  ${f.name}: string;`;
    })
    .join("\n");

  const fieldJsx = schema.fields
    .map((f) => {
      const placeholder = f.placeholder ? ` placeholder="${f.placeholder}"` : "";
      if (f.type === "textarea") {
        return `        <div className="space-y-1">
          <label htmlFor="${f.id}" className="text-sm font-medium">${f.label}</label>
          <Field as="textarea" id="${f.id}" name="${f.name}" className="w-full rounded-md border px-3 py-2 text-sm"${placeholder} />
          <ErrorMessage name="${f.name}" component="p" className="text-sm text-red-500" />
        </div>`;
      }
      if (f.type === "select" && f.options) {
        const opts = f.options
          .map((o) => `            <option value="${o.value}">${o.label}</option>`)
          .join("\n");
        return `        <div className="space-y-1">
          <label htmlFor="${f.id}" className="text-sm font-medium">${f.label}</label>
          <Field as="select" id="${f.id}" name="${f.name}" className="w-full rounded-md border px-3 py-2 text-sm">
${opts}
          </Field>
          <ErrorMessage name="${f.name}" component="p" className="text-sm text-red-500" />
        </div>`;
      }
      if (f.type === "checkbox") {
        return `        <div className="flex items-center gap-2">
          <Field type="checkbox" id="${f.id}" name="${f.name}" />
          <label htmlFor="${f.id}" className="text-sm font-medium">${f.label}</label>
          <ErrorMessage name="${f.name}" component="p" className="text-sm text-red-500" />
        </div>`;
      }
      return `        <div className="space-y-1">
          <label htmlFor="${f.id}" className="text-sm font-medium">${f.label}</label>
          <Field type="${f.type}" id="${f.id}" name="${f.name}" className="w-full rounded-md border px-3 py-2 text-sm"${placeholder} />
          <ErrorMessage name="${f.name}" component="p" className="text-sm text-red-500" />
        </div>`;
    })
    .join("\n\n");

  return `import { Formik, Form, Field, ErrorMessage } from "formik";
import * as Yup from "yup";

interface ${dataType} {
${typeFields}
}

const validationSchema = Yup.object({
${schema.fields
  .map((f) => {
    const rules: string[] = [];
    if (f.type === "email") rules.push('.email("Invalid email address")');
    if (f.type === "number") rules.push(".number()");
    for (const r of f.validation ?? []) {
      if (r.type === "required") rules.push(`.required("${r.message}")`);
      if (r.type === "minLength") rules.push(`.min(${String(r.value)}, "${r.message}")`);
      if (r.type === "maxLength") rules.push(`.max(${String(r.value)}, "${r.message}")`);
    }
    const baseType = f.type === "number" ? "Yup.number()" : "Yup.string()";
    return `  ${f.name}: ${baseType}${rules.join("")},`;
  })
  .join("\n")}
});

export function ${componentName}() {
  const initialValues: ${dataType} = {
${initialValues}
  };

  async function handleSubmit(values: ${dataType}) {
    // TODO: replace with your API call
    console.log(values);
  }

  return (
    <Formik initialValues={initialValues} validationSchema={validationSchema} onSubmit={handleSubmit}>
      {({ isSubmitting }) => (
        <Form className="space-y-4">
${fieldJsx}

          <button
            type="submit"
            disabled={isSubmitting}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {isSubmitting ? "Submitting..." : "${schema.submitLabel ?? "Submit"}"}
          </button>
        </Form>
      )}
    </Formik>
  );
}
`;
}

// ─── Plain HTML ───────────────────────────────────────────────────────────────

export function generateHtml(schema: FormSchema): string {
  const fields = schema.fields
    .map((f) => {
      const required = isRequired(f) ? " required" : "";
      const placeholder = f.placeholder ? ` placeholder="${f.placeholder}"` : "";
      const minLen = (f.validation ?? []).find((r) => r.type === "minLength");
      const maxLen = (f.validation ?? []).find((r) => r.type === "maxLength");
      const pattern = (f.validation ?? []).find((r) => r.type === "pattern");
      const attrs = [
        required,
        minLen ? ` minlength="${String(minLen.value)}"` : "",
        maxLen ? ` maxlength="${String(maxLen.value)}"` : "",
        pattern ? ` pattern="${String(pattern.value)}"` : "",
        placeholder,
      ].join("");

      if (f.type === "textarea") {
        return `  <div>
    <label for="${f.id}">${f.label}</label>
    <textarea id="${f.id}" name="${f.name}"${attrs}></textarea>
  </div>`;
      }
      if (f.type === "select" && f.options) {
        const opts = f.options
          .map((o) => `      <option value="${o.value}">${o.label}</option>`)
          .join("\n");
        return `  <div>
    <label for="${f.id}">${f.label}</label>
    <select id="${f.id}" name="${f.name}"${required}>
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
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${schema.title}</title>
</head>
<body>
  <form method="post" novalidate>
    <h2>${schema.title}</h2>
${fields}
    <button type="submit">${schema.submitLabel ?? "Submit"}</button>
  </form>
</body>
</html>
`;
}
