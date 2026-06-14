// DSL format:
// API: Blog API v1.0 | baseUrl:https://api.blog.com | auth:BearerJWT
//
// GET  /users          → 200:[User[]]
// POST /users          → 201:User, 400:ValidationError  [body:CreateUserInput]
// GET  /users/{id}     → 200:User, 404:NotFound         [path:id]

import { nanoid } from "nanoid";
import type { OpenApiSpec, ApiEndpoint } from "@ai-builder/schemas";

// ─── Serialize ────────────────────────────────────────────────────────────────

function serializeEndpoint(e: ApiEndpoint): string {
  const method = e.method.padEnd(7);
  const responses = e.responses
    .map((r) => String(r.status) + ":" + (r.schema ?? r.description))
    .join(", ");
  const params = (e.parameters ?? []).map((p) => p.in + ":" + p.name).join(",");
  const paramStr = params ? "  [" + params + "]" : "";
  const deprecated = e.deprecated ? "  [deprecated]" : "";
  const summary = e.summary ? "  # " + e.summary : "";
  return method + " " + e.path + "  → " + responses + paramStr + deprecated + summary;
}

export function serializeApiDSL(spec: OpenApiSpec): string {
  const meta = ["API: " + spec.title + " v" + spec.version];
  if (spec.baseUrl) meta.push("baseUrl:" + spec.baseUrl);
  if (spec.securityScheme && spec.securityScheme !== "None")
    meta.push("auth:" + spec.securityScheme);
  const header = meta.join(" | ");

  const endpointLines = spec.endpoints.map(serializeEndpoint).join("\n");

  const schemaLines = spec.schemas
    .map((s) => {
      const props = Object.entries(s.properties)
        .map(([k, v]) => "  " + k + ": " + v)
        .join("\n");
      return "SCHEMA " + s.name + "\n" + props;
    })
    .join("\n\n");

  const parts = [header];
  if (endpointLines) parts.push("", endpointLines);
  if (schemaLines) parts.push("", schemaLines);
  return parts.join("\n");
}

// ─── Deserialize ─────────────────────────────────────────────────────────────

export function deserializeApiDSL(dsl: string): OpenApiSpec {
  const lines = dsl.split("\n");
  const firstLine = lines[0] ?? "";

  const titleMatch = /API:\s*(.+?)\s+v([^\s|]+)/.exec(firstLine);
  const title = titleMatch?.[1] ?? "API";
  const version = titleMatch?.[2] ?? "1.0";

  const baseUrlMatch = /baseUrl:(\S+)/.exec(firstLine);
  const authMatch = /auth:(\S+)/.exec(firstLine);

  const endpoints: ApiEndpoint[] = [];

  for (const line of lines.slice(1)) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    const methodMatch = /^(GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS)\s+(\S+)\s*→\s*(.+)/.exec(
      trimmed
    );
    if (!methodMatch) continue;

    const [, method, path, rest] = methodMatch;
    const paramMatch = /\[([^\]]+)\]/.exec(rest ?? "");
    const responsePart = rest?.split("[")[0]?.trim() ?? "";

    const responses = responsePart.split(",").map((r) => {
      const [statusStr, ...schemaParts] = r.trim().split(":");
      return {
        status: parseInt(statusStr ?? "200", 10),
        description: schemaParts.join(":"),
        schema: schemaParts.join(":") || null,
      };
    });

    const parameters = (paramMatch?.[1] ?? "")
      .split(",")
      .filter(Boolean)
      .map((p) => {
        const [paramIn, paramName] = p.trim().split(":");
        return {
          name: paramName ?? "",
          in: (paramIn ?? "query") as "path" | "query" | "header" | "cookie",
          required: paramIn === "path",
          schema: null,
          description: null,
        };
      });

    endpoints.push({
      id: "ep_" + nanoid(6),
      method: (method ?? "GET") as ApiEndpoint["method"],
      path: path ?? "/",
      summary: null,
      parameters: parameters.length ? parameters : null,
      responses,
      tags: null,
      deprecated: null,
    });
  }

  return {
    id: "api_" + nanoid(6),
    title,
    version,
    baseUrl: baseUrlMatch?.[1] ?? null,
    securityScheme: (authMatch?.[1] as OpenApiSpec["securityScheme"]) ?? null,
    description: null,
    endpoints,
    schemas: [],
  };
}

// ─── OpenAPI 3.1 JSON generation ─────────────────────────────────────────────

export function generateOpenApiJson(spec: OpenApiSpec): Record<string, unknown> {
  const paths: Record<string, unknown> = {};

  for (const ep of spec.endpoints) {
    const pathObj = (paths[ep.path] ?? {}) as Record<string, unknown>;
    const method = ep.method.toLowerCase();
    const parameters = (ep.parameters ?? []).map((p) => ({
      name: p.name,
      in: p.in,
      required: p.required,
      schema: { type: "string" },
      description: p.description,
    }));
    const responses: Record<string, unknown> = {};
    for (const r of ep.responses) {
      responses[String(r.status)] = {
        description: r.description,
        ...(r.schema
          ? {
              content: {
                "application/json": { schema: { $ref: "#/components/schemas/" + r.schema } },
              },
            }
          : {}),
      };
    }
    pathObj[method] = {
      summary: ep.summary,
      tags: ep.tags,
      deprecated: ep.deprecated ?? undefined,
      parameters,
      responses,
    };
    paths[ep.path] = pathObj;
  }

  const schemas: Record<string, unknown> = {};
  for (const s of spec.schemas) {
    const properties: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(s.properties)) {
      properties[k] = { type: v };
    }
    schemas[s.name] = { type: "object", properties, required: s.required ?? [] };
  }

  return {
    openapi: "3.1.0",
    info: { title: spec.title, version: spec.version, description: spec.description },
    servers: spec.baseUrl ? [{ url: spec.baseUrl }] : [],
    paths,
    components: { schemas },
    security:
      spec.securityScheme && spec.securityScheme !== "None" ? [{ [spec.securityScheme]: [] }] : [],
  };
}
