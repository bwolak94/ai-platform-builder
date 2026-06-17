import { nanoid } from "nanoid";
import type { OpenApiSpec } from "@ai-builder/schemas";

export interface LintIssue {
  id: string;
  level: "error" | "warning" | "info";
  message: string;
  endpointId?: string;
}

const KEBAB_SEGMENT_RE = /^[a-z0-9-]+$/;

function isKebabPath(path: string): boolean {
  const withoutParams = path.replace(/\{[^}]+\}/g, "x");
  return withoutParams
    .split("/")
    .filter(Boolean)
    .every((seg) => KEBAB_SEGMENT_RE.test(seg));
}

export function lintApiSpec(spec: OpenApiSpec): LintIssue[] {
  const issues: LintIssue[] = [];
  const seenKeys = new Set<string>();

  for (const ep of spec.endpoints) {
    const label = `${ep.method} ${ep.path}`;

    // Duplicate method+path
    const key = ep.method + " " + ep.path;
    if (seenKeys.has(key)) {
      issues.push({
        id: nanoid(4),
        level: "error",
        message: `Duplicate endpoint: ${label}`,
        endpointId: ep.id,
      });
    }
    seenKeys.add(key);

    // Missing summary
    if (!ep.summary) {
      issues.push({
        id: nanoid(4),
        level: "warning",
        message: `${label} is missing a summary`,
        endpointId: ep.id,
      });
    }

    // GET with {id} path param should have 404
    if (
      ep.method === "GET" &&
      ep.path.includes("{") &&
      !ep.responses.some((r) => r.status === 404)
    ) {
      issues.push({
        id: nanoid(4),
        level: "warning",
        message: `${label} fetches by ID but has no 404 response`,
        endpointId: ep.id,
      });
    }

    // POST/PUT/PATCH without requestBody
    if (["POST", "PUT", "PATCH"].includes(ep.method) && ep.requestBody === null) {
      issues.push({
        id: nanoid(4),
        level: "info",
        message: `${label} has no request body defined`,
        endpointId: ep.id,
      });
    }

    // Path not kebab-case
    if (!isKebabPath(ep.path)) {
      issues.push({
        id: nanoid(4),
        level: "warning",
        message: `Path "${ep.path}" should use kebab-case segments`,
        endpointId: ep.id,
      });
    }

    // Mutating endpoints without auth when scheme is configured
    if (
      spec.securityScheme &&
      spec.securityScheme !== "None" &&
      !["GET", "HEAD", "OPTIONS"].includes(ep.method) &&
      !ep.requiresAuth
    ) {
      issues.push({
        id: nanoid(4),
        level: "info",
        message: `${label} may need requiresAuth (${spec.securityScheme} is configured)`,
        endpointId: ep.id,
      });
    }

    // No 5xx response
    if (!ep.responses.some((r) => r.status >= 500)) {
      issues.push({
        id: nanoid(4),
        level: "info",
        message: `${label} has no 5xx error response`,
        endpointId: ep.id,
      });
    }

    // Tags used but not defined at spec level
    for (const tag of ep.tags ?? []) {
      if (!(spec.tagDefinitions ?? []).some((t) => t.name === tag)) {
        issues.push({
          id: nanoid(4),
          level: "warning",
          message: `Tag "${tag}" used in ${label} is not defined in the spec`,
          endpointId: ep.id,
        });
      }
    }
  }

  // Spec-level checks
  if (spec.endpoints.length === 0) {
    issues.push({
      id: nanoid(4),
      level: "info",
      message: "No endpoints defined yet",
    });
  }

  if (!spec.baseUrl) {
    issues.push({
      id: nanoid(4),
      level: "info",
      message: "No base URL set (servers will be empty in the exported spec)",
    });
  }

  if (!spec.description) {
    issues.push({
      id: nanoid(4),
      level: "info",
      message: "API has no description",
    });
  }

  return issues;
}

export function lintSummary(issues: LintIssue[]): {
  errors: number;
  warnings: number;
  infos: number;
} {
  return {
    errors: issues.filter((i) => i.level === "error").length,
    warnings: issues.filter((i) => i.level === "warning").length,
    infos: issues.filter((i) => i.level === "info").length,
  };
}
