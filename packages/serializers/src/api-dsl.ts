// DSL format:
// API: Blog API v1.0 | baseUrl:https://api.blog.com | auth:BearerJWT
//
// TAGS: posts(Blog posts), users(User management)
//
// GET    /users          → 200:User[]                         # List users
// POST   /users          → 201:User, 400:ValidationError      [body:CreateUserInput] [auth]
// GET    /users/{id}     → 200:User, 404:NotFound             [path:id]
// DELETE /users/{id}     → 204:NoContent                      [path:id] [auth] [tags:users]
//
// SCHEMA User
//   id!: string
//   name!: string
//   email!: string
//   age: integer

import { nanoid } from "nanoid";
import type { OpenApiSpec, ApiEndpoint, ApiTagDefinition } from "@ai-builder/schemas";

// ─── Type helpers ─────────────────────────────────────────────────────────────

function typeToJsonSchema(typeStr: string): Record<string, unknown> {
  const trimmed = typeStr.trim();
  if (trimmed.endsWith("[]")) {
    return { type: "array", items: typeToJsonSchema(trimmed.slice(0, -2)) };
  }
  switch (trimmed) {
    case "number":
      return { type: "number" };
    case "integer":
      return { type: "integer" };
    case "boolean":
      return { type: "boolean" };
    case "string":
      return { type: "string" };
    case "object":
      return { type: "object" };
    default:
      return { $ref: "#/components/schemas/" + trimmed };
  }
}

// ─── Serialize ────────────────────────────────────────────────────────────────

function serializeEndpoint(e: ApiEndpoint): string {
  const method = e.method.padEnd(7);
  const responses = e.responses
    .map((r) => String(r.status) + ":" + (r.schema ?? r.description))
    .join(", ");

  const paramParts: string[] = (e.parameters ?? []).map((p) => p.in + ":" + p.name);
  if (e.requestBody) paramParts.push("body:" + e.requestBody.schemaRef);

  const bracketParts: string[] = [];
  if (paramParts.length) bracketParts.push("[" + paramParts.join(",") + "]");
  if (e.deprecated) bracketParts.push("[deprecated]");
  if (e.requiresAuth) bracketParts.push("[auth]");
  if ((e.tags ?? []).length) bracketParts.push("[tags:" + (e.tags ?? []).join(",") + "]");

  const brackets = bracketParts.length ? "  " + bracketParts.join(" ") : "";
  const summary = e.summary ? "  # " + e.summary : "";
  return method + " " + e.path + "  → " + responses + brackets + summary;
}

export function serializeApiDSL(spec: OpenApiSpec): string {
  const meta = ["API: " + spec.title + " v" + spec.version];
  if (spec.baseUrl) meta.push("baseUrl:" + spec.baseUrl);
  if (spec.securityScheme && spec.securityScheme !== "None")
    meta.push("auth:" + spec.securityScheme);
  const header = meta.join(" | ");

  const tagLine =
    (spec.tagDefinitions ?? []).length > 0
      ? "TAGS: " +
        (spec.tagDefinitions ?? [])
          .map((t) => t.name + (t.description ? "(" + t.description + ")" : ""))
          .join(", ")
      : null;

  const endpointLines = spec.endpoints.map(serializeEndpoint).join("\n");

  const schemaLines = spec.schemas
    .map((s) => {
      const descLine = s.description ? "  # " + s.description + "\n" : "";
      const props = Object.entries(s.properties)
        .map(([k, v]) => {
          const isRequired = (s.required ?? []).includes(k);
          return "  " + k + (isRequired ? "!" : "") + ": " + v;
        })
        .join("\n");
      return "SCHEMA " + s.name + "\n" + descLine + props;
    })
    .join("\n\n");

  const parts = [header];
  if (tagLine) parts.push("", tagLine);
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
  const tagDefinitions: ApiTagDefinition[] = [];
  const schemaObjects: OpenApiSpec["schemas"] = [];

  // Parse TAGS line
  const tagsLine = lines.find((l) => l.trim().startsWith("TAGS:"));
  if (tagsLine) {
    const tagsContent = tagsLine.replace(/^TAGS:\s*/, "").trim();
    for (const tagEntry of tagsContent.split(",")) {
      const match = /(\w+)\(([^)]*)\)/.exec(tagEntry.trim());
      if (match) {
        tagDefinitions.push({ name: match[1] ?? "", description: match[2] ?? null });
      } else {
        const name = tagEntry.trim();
        if (name) tagDefinitions.push({ name, description: null });
      }
    }
  }

  let i = 1;
  while (i < lines.length) {
    const line = lines[i] ?? "";
    const trimmed = line.trim();
    i++;

    if (!trimmed || trimmed.startsWith("TAGS:")) continue;

    // SCHEMA block
    if (trimmed.startsWith("SCHEMA ")) {
      const schemaName = trimmed.slice(7).trim();
      const properties: Record<string, string> = {};
      const required: string[] = [];
      let description: string | null = null;

      while (i < lines.length) {
        const propLine = lines[i] ?? "";
        if (propLine.length > 0 && !propLine.startsWith(" ") && !propLine.startsWith("\t")) break;
        const propTrimmed = propLine.trim();
        i++;

        if (!propTrimmed) continue;

        if (propTrimmed.startsWith("# ")) {
          description = propTrimmed.slice(2).trim();
          continue;
        }

        const propMatch = /^(\w+)(!)?:\s*(.+)$/.exec(propTrimmed);
        if (propMatch) {
          const [, propName, bang, propType] = propMatch;
          if (propName && propType) {
            properties[propName] = propType.trim();
            if (bang) required.push(propName);
          }
        }
      }

      if (schemaName && Object.keys(properties).length > 0) {
        schemaObjects.push({
          name: schemaName,
          description,
          properties,
          required: required.length > 0 ? required : null,
        });
      }
      continue;
    }

    // Endpoint line
    const methodMatch = /^(GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS)\s+(\S+)\s*→\s*(.+)/.exec(
      trimmed
    );
    if (!methodMatch) continue;

    const [, method, path, rest] = methodMatch;

    // Strip inline summary before parsing brackets
    const summaryMatch = /\s#\s+(.+)$/.exec(rest ?? "");
    const summary = summaryMatch?.[1]?.trim() ?? null;
    const restWithoutSummary = summaryMatch
      ? (rest ?? "").slice(0, summaryMatch.index)
      : (rest ?? "");

    const bracketMatches = [...restWithoutSummary.matchAll(/\[([^\]]+)\]/g)];
    const responsePart = (restWithoutSummary.split("[")[0] ?? "").trim();

    const responses = responsePart
      .split(",")
      .filter(Boolean)
      .map((r) => {
        const colonIdx = r.trim().indexOf(":");
        const statusStr = colonIdx >= 0 ? r.trim().slice(0, colonIdx) : r.trim();
        const schemaStr = colonIdx >= 0 ? r.trim().slice(colonIdx + 1) : "";
        return {
          status: parseInt(statusStr, 10) || 200,
          description: schemaStr || statusStr,
          schema: schemaStr || null,
        };
      });

    let requestBody: ApiEndpoint["requestBody"] = null;
    let deprecated: boolean | null = null;
    let requiresAuth: boolean | null = null;
    let tags: string[] | null = null;
    const parameters: NonNullable<ApiEndpoint["parameters"]> = [];

    for (const bracketMatch of bracketMatches) {
      const content = bracketMatch[1] ?? "";
      if (content === "deprecated") {
        deprecated = true;
      } else if (content === "auth") {
        requiresAuth = true;
      } else if (content.startsWith("tags:")) {
        tags = content.slice(5).split(",").filter(Boolean);
      } else {
        for (const part of content.split(",")) {
          const colonIdx = part.trim().indexOf(":");
          if (colonIdx < 0) continue;
          const paramIn = part.trim().slice(0, colonIdx);
          const paramName = part.trim().slice(colonIdx + 1);
          if (paramIn === "body" && paramName) {
            requestBody = {
              contentType: "application/json",
              schemaRef: paramName,
              description: null,
            };
          } else if (paramIn && paramName) {
            parameters.push({
              name: paramName,
              in: paramIn as "path" | "query" | "header" | "cookie",
              required: paramIn === "path",
              schema: null,
              description: null,
            });
          }
        }
      }
    }

    endpoints.push({
      id: "ep_" + nanoid(6),
      method: (method ?? "GET") as ApiEndpoint["method"],
      path: path ?? "/",
      summary,
      description: null,
      parameters: parameters.length ? parameters : null,
      requestBody,
      responses,
      tags: tags && tags.length > 0 ? tags : null,
      deprecated,
      requiresAuth,
    });
  }

  return {
    id: "api_" + nanoid(6),
    title,
    version,
    baseUrl: baseUrlMatch?.[1] ?? null,
    securityScheme: (authMatch?.[1] as OpenApiSpec["securityScheme"]) ?? null,
    description: null,
    tagDefinitions: tagDefinitions.length > 0 ? tagDefinitions : null,
    endpoints,
    schemas: schemaObjects,
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
      schema: typeToJsonSchema(p.schema ?? "string"),
      ...(p.description ? { description: p.description } : {}),
    }));

    const responses: Record<string, unknown> = {};
    for (const r of ep.responses) {
      responses[String(r.status)] = {
        description: r.description,
        ...(r.schema
          ? {
              content: {
                "application/json": { schema: typeToJsonSchema(r.schema) },
              },
            }
          : {}),
      };
    }

    const requestBody = ep.requestBody
      ? {
          ...(ep.requestBody.description ? { description: ep.requestBody.description } : {}),
          required: true,
          content: {
            [ep.requestBody.contentType]: {
              schema: { $ref: "#/components/schemas/" + ep.requestBody.schemaRef },
            },
          },
        }
      : undefined;

    const epSecurity =
      ep.requiresAuth && spec.securityScheme && spec.securityScheme !== "None"
        ? [{ [spec.securityScheme]: [] }]
        : undefined;

    pathObj[method] = {
      ...(ep.summary ? { summary: ep.summary } : {}),
      ...(ep.description ? { description: ep.description } : {}),
      ...(ep.tags ? { tags: ep.tags } : {}),
      ...(ep.deprecated ? { deprecated: true } : {}),
      parameters,
      ...(requestBody ? { requestBody } : {}),
      responses,
      ...(epSecurity ? { security: epSecurity } : {}),
    };
    paths[ep.path] = pathObj;
  }

  const schemas: Record<string, unknown> = {};
  for (const s of spec.schemas) {
    const properties: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(s.properties)) {
      properties[k] = typeToJsonSchema(v);
    }
    schemas[s.name] = {
      type: "object",
      ...(s.description ? { description: s.description } : {}),
      properties,
      ...(s.required?.length ? { required: s.required } : {}),
    };
  }

  const securitySchemes: Record<string, unknown> = {};
  if (spec.securityScheme && spec.securityScheme !== "None") {
    switch (spec.securityScheme) {
      case "BearerJWT":
        securitySchemes.BearerJWT = { type: "http", scheme: "bearer", bearerFormat: "JWT" };
        break;
      case "ApiKey":
        securitySchemes.ApiKey = { type: "apiKey", in: "header", name: "X-API-Key" };
        break;
      case "OAuth2":
        securitySchemes.OAuth2 = { type: "oauth2", flows: {} };
        break;
      case "BasicAuth":
        securitySchemes.BasicAuth = { type: "http", scheme: "basic" };
        break;
    }
  }

  return {
    openapi: "3.1.0",
    info: {
      title: spec.title,
      version: spec.version,
      ...(spec.description ? { description: spec.description } : {}),
    },
    ...(spec.tagDefinitions?.length
      ? {
          tags: spec.tagDefinitions.map((t) => ({
            name: t.name,
            ...(t.description ? { description: t.description } : {}),
          })),
        }
      : {}),
    servers: spec.baseUrl ? [{ url: spec.baseUrl }] : [],
    paths,
    components: {
      schemas,
      ...(Object.keys(securitySchemes).length ? { securitySchemes } : {}),
    },
    security:
      spec.securityScheme && spec.securityScheme !== "None" ? [{ [spec.securityScheme]: [] }] : [],
  };
}

// ─── Postman collection ───────────────────────────────────────────────────────

export function generatePostmanCollection(spec: OpenApiSpec): string {
  const getAuthHeaders = (ep: ApiEndpoint): { key: string; value: string; type: string }[] => {
    if (!ep.requiresAuth || !spec.securityScheme || spec.securityScheme === "None") return [];
    switch (spec.securityScheme) {
      case "BearerJWT":
        return [{ key: "Authorization", value: "Bearer {{token}}", type: "text" }];
      case "ApiKey":
        return [{ key: "X-API-Key", value: "{{apiKey}}", type: "text" }];
      case "BasicAuth":
        return [{ key: "Authorization", value: "Basic {{basicAuth}}", type: "text" }];
      default:
        return [];
    }
  };

  const items = spec.endpoints.map((ep) => {
    const rawUrl = (spec.baseUrl ?? "http://localhost") + ep.path;
    const pathParams = (ep.parameters ?? [])
      .filter((p) => p.in === "path")
      .map((p) => ({
        key: p.name,
        value: "{{" + p.name + "}}",
        description: p.description ?? "",
      }));
    const queryParams = (ep.parameters ?? [])
      .filter((p) => p.in === "query")
      .map((p) => ({
        key: p.name,
        value: "",
        description: p.description ?? "",
        disabled: !p.required,
      }));
    const headerParams = (ep.parameters ?? [])
      .filter((p) => p.in === "header")
      .map((p) => ({ key: p.name, value: "", description: p.description ?? "", type: "text" }));

    const hasBody = ep.requestBody !== null && ["POST", "PUT", "PATCH"].includes(ep.method);

    return {
      name: ep.summary ?? ep.method + " " + ep.path,
      request: {
        method: ep.method,
        header: [
          { key: "Content-Type", value: "application/json", type: "text" },
          ...headerParams,
          ...getAuthHeaders(ep),
        ],
        url: {
          raw: rawUrl,
          host: [spec.baseUrl ?? "http://localhost"],
          path: ep.path.split("/").filter(Boolean),
          variable: pathParams,
          query: queryParams,
        },
        description: ep.description ?? ep.summary ?? "",
        ...(hasBody
          ? {
              body: {
                mode: "raw",
                raw: "{}",
                options: { raw: { language: "json" } },
              },
            }
          : {}),
      },
    };
  });

  const collection = {
    info: {
      name: spec.title,
      description: spec.description ?? "",
      version: spec.version,
      schema: "https://schema.getpostman.com/json/collection/v2.1.0/collection.json",
    },
    variable: [
      { key: "baseUrl", value: spec.baseUrl ?? "http://localhost" },
      ...(spec.securityScheme === "BearerJWT"
        ? [{ key: "token", value: "", description: "JWT Bearer token" }]
        : spec.securityScheme === "ApiKey"
          ? [{ key: "apiKey", value: "", description: "API key" }]
          : []),
    ],
    item: items,
  };

  return JSON.stringify(collection, null, 2);
}

// ─── SDK generators ───────────────────────────────────────────────────────────

export function generateTypeScriptSDK(spec: OpenApiSpec): string {
  const base = spec.baseUrl ?? "http://localhost";
  const hasAuth = spec.securityScheme && spec.securityScheme !== "None";

  const lines: string[] = [
    `// Generated TypeScript SDK — ${spec.title} v${spec.version}`,
    `// Auto-generated by AI Platform Builder`,
    ``,
    `const BASE_URL = "${base}";`,
    ``,
  ];

  if (spec.securityScheme === "BearerJWT") {
    lines.push(
      `let _token = "";`,
      `export function setToken(token: string): void { _token = token; }`,
      ``
    );
  } else if (spec.securityScheme === "ApiKey") {
    lines.push(
      `let _apiKey = "";`,
      `export function setApiKey(key: string): void { _apiKey = key; }`,
      ``
    );
  }

  lines.push(
    `async function request<T>(`,
    `  method: string,`,
    `  path: string,`,
    `  body?: unknown,`,
    `  query?: Record<string, string>`,
    `): Promise<T> {`,
    `  const headers: Record<string, string> = { "Content-Type": "application/json" };`
  );

  if (hasAuth) {
    if (spec.securityScheme === "BearerJWT") {
      lines.push(`  if (_token) headers["Authorization"] = \`Bearer \${_token}\`;`);
    } else if (spec.securityScheme === "ApiKey") {
      lines.push(`  if (_apiKey) headers["X-API-Key"] = _apiKey;`);
    }
  }

  lines.push(
    `  const qs = query ? "?" + new URLSearchParams(query).toString() : "";`,
    `  const res = await fetch(BASE_URL + path + qs, {`,
    `    method,`,
    `    headers,`,
    `    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),`,
    `  });`,
    `  if (!res.ok) throw new Error(\`\${method} \${path} → \${res.status} \${res.statusText}\`);`,
    `  if (res.status === 204) return undefined as T;`,
    `  return res.json() as Promise<T>;`,
    `}`,
    ``
  );

  for (const ep of spec.endpoints) {
    const pathParams = (ep.parameters ?? []).filter((p) => p.in === "path");
    const queryParams = (ep.parameters ?? []).filter((p) => p.in === "query");

    // Derive function name from method + path
    const segments = ep.path
      .replace(/\{[^}]+\}/g, "")
      .split(/[/-]/)
      .filter(Boolean)
      .map((s) => s.charAt(0).toUpperCase() + s.slice(1));
    const funcName = ep.method.toLowerCase() + segments.join("");

    const paramList: string[] = pathParams.map((p) => `${p.name}: string`);
    if (queryParams.length) {
      const qFields = queryParams.map((p) => `${p.name}?: string`).join("; ");
      paramList.push(`query?: { ${qFields} }`);
    }
    if (ep.requestBody !== null) {
      paramList.push(`body?: Record<string, unknown>`);
    }

    const pathStr = ep.path.replace(/\{(\w+)\}/g, "${$1}");
    const queryArg = queryParams.length ? `query as Record<string, string>` : `undefined`;
    const bodyArg = ep.requestBody !== null ? `body` : `undefined`;

    if (ep.summary) lines.push(`/** ${ep.summary} */`);
    lines.push(
      `export async function ${funcName}(${paramList.join(", ")}): Promise<unknown> {`,
      `  return request("${ep.method}", \`${pathStr}\`, ${bodyArg}, ${queryArg});`,
      `}`,
      ``
    );
  }

  return lines.join("\n");
}

export function generateCurlScript(spec: OpenApiSpec): string {
  const base = spec.baseUrl ?? "http://localhost";
  const lines: string[] = [
    `#!/bin/bash`,
    `# Generated cURL script — ${spec.title} v${spec.version}`,
    `# Auto-generated by AI Platform Builder`,
    ``,
    `BASE_URL="${base}"`,
  ];

  if (spec.securityScheme === "BearerJWT") {
    lines.push(`TOKEN="your_jwt_token_here"`);
  } else if (spec.securityScheme === "ApiKey") {
    lines.push(`API_KEY="your_api_key_here"`);
  }
  lines.push(``);

  for (const ep of spec.endpoints) {
    const authHeaders: string[] = [];
    if (ep.requiresAuth) {
      if (spec.securityScheme === "BearerJWT")
        authHeaders.push(`-H "Authorization: Bearer $TOKEN"`);
      else if (spec.securityScheme === "ApiKey") authHeaders.push(`-H "X-API-Key: $API_KEY"`);
    }

    const pathWithPlaceholders = ep.path.replace(
      /\{(\w+)\}/g,
      (_m, name: string) => `$${name.toUpperCase()}`
    );

    const headerFlags = [`-H "Content-Type: application/json"`, ...authHeaders];
    const bodyFlag =
      ep.requestBody && ["POST", "PUT", "PATCH"].includes(ep.method) ? [`-d '{}'`] : [];

    const allFlags = [...headerFlags, ...bodyFlag];
    const flagStr = allFlags.map((f) => `  ${f}`).join(` \\\n`);

    if (ep.summary) lines.push(`# ${ep.summary}`);
    lines.push(`curl -X ${ep.method} "$BASE_URL${pathWithPlaceholders}" \\`, flagStr, ``);
  }

  return lines.join("\n");
}

export function generatePythonSDK(spec: OpenApiSpec): string {
  const base = spec.baseUrl ?? "http://localhost";
  const lines: string[] = [
    `# Generated Python SDK — ${spec.title} v${spec.version}`,
    `# Requires: pip install httpx`,
    `# Auto-generated by AI Platform Builder`,
    ``,
    `import httpx`,
    `from typing import Any`,
    ``,
    `BASE_URL = "${base}"`,
    `_headers: dict[str, str] = {"Content-Type": "application/json"}`,
    ``,
  ];

  if (spec.securityScheme === "BearerJWT") {
    lines.push(
      `def set_token(token: str) -> None:`,
      `    """Set the JWT bearer token for all requests."""`,
      `    _headers["Authorization"] = f"Bearer {token}"`,
      ``
    );
  } else if (spec.securityScheme === "ApiKey") {
    lines.push(
      `def set_api_key(key: str) -> None:`,
      `    """Set the API key for all requests."""`,
      `    _headers["X-API-Key"] = key`,
      ``
    );
  }

  lines.push(
    `async def _request(method: str, path: str, body: Any = None, **params: str) -> Any:`,
    `    async with httpx.AsyncClient(base_url=BASE_URL, headers=_headers) as client:`,
    `        kwargs: dict[str, Any] = {}`,
    `        if body is not None:`,
    `            kwargs["json"] = body`,
    `        if params:`,
    `            kwargs["params"] = params`,
    `        response = await client.request(method, path, **kwargs)`,
    `        response.raise_for_status()`,
    `        if response.status_code == 204:`,
    `            return None`,
    `        return response.json()`,
    ``
  );

  for (const ep of spec.endpoints) {
    const pathParams = (ep.parameters ?? []).filter((p) => p.in === "path");
    const queryParams = (ep.parameters ?? []).filter((p) => p.in === "query");

    const segments = ep.path
      .replace(/\{[^}]+\}/g, "")
      .split(/[/-]/)
      .filter(Boolean)
      .join("_")
      .toLowerCase();
    const funcName = ep.method.toLowerCase() + (segments ? "_" + segments : "");

    const paramList: string[] = pathParams.map((p) => `${p.name}: str`);
    if (ep.requestBody !== null) paramList.push(`body: dict[str, Any] | None = None`);
    if (queryParams.length)
      paramList.push(...queryParams.map((p) => `${p.name}: str | None = None`));

    const pathStr = ep.path.replace(/\{(\w+)\}/g, "{$1}");
    const bodyArg = ep.requestBody !== null ? `, body=body` : ``;
    const queryArgParts = queryParams.map(
      (p) => `**({${JSON.stringify(p.name)}: ${p.name}} if ${p.name} else {})`
    );
    const queryArg = queryArgParts.length ? `, ` + queryArgParts.join(`, `) : ``;

    if (ep.summary) lines.push(`# ${ep.summary}`);
    lines.push(
      `async def ${funcName}(${paramList.join(", ")}) -> Any:`,
      `    return await _request("${ep.method}", f"${pathStr}"${bodyArg}${queryArg})`,
      ``
    );
  }

  return lines.join("\n");
}

// ─── Mock data generation ─────────────────────────────────────────────────────

function mockValueForType(typeStr: string): unknown {
  if (typeStr.endsWith("[]")) {
    return [mockValueForType(typeStr.slice(0, -2))];
  }
  switch (typeStr) {
    case "string":
      return "example_string";
    case "number":
      return 42.5;
    case "integer":
      return 42;
    case "boolean":
      return true;
    default:
      return null;
  }
}

export function generateMockForEndpoint(
  spec: OpenApiSpec,
  endpointId: string
): Record<string, unknown> | null {
  const ep = spec.endpoints.find((e) => e.id === endpointId);
  if (!ep) return null;

  const successResponse = ep.responses.find((r) => r.status >= 200 && r.status < 300);
  const schemaRef = successResponse?.schema;

  if (schemaRef) {
    const isArray = schemaRef.endsWith("[]");
    const schemaName = isArray ? schemaRef.slice(0, -2) : schemaRef;
    const schemaObj = spec.schemas.find((s) => s.name === schemaName);

    if (schemaObj) {
      const obj: Record<string, unknown> = {};
      for (const [key, type] of Object.entries(schemaObj.properties)) {
        obj[key] = mockValueForType(type);
      }
      return isArray ? { data: [obj], total: 1, page: 1 } : obj;
    }
  }

  return {
    id: nanoid(8),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}
