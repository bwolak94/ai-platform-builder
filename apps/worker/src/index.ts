import { routeAgentRequest } from "agents";
import type { Env } from "./types";
export { BuilderAgent } from "./agent";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...CORS_HEADERS },
  });
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    // CORS preflight
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: CORS_HEADERS });
    }

    // Health check
    if (url.pathname === "/" && request.method === "GET") {
      return json({ status: "ok", service: "ai-builder" });
    }

    // ─── Snapshot REST API ─────────────────────────────────────────────────────
    // GET  /api/snapshots/:mode        → list snapshots for that mode's DO
    // POST /api/snapshots/:mode        → save a new snapshot
    // DELETE /api/snapshots/:mode/:id  → delete a snapshot
    if (url.pathname.startsWith("/api/snapshots/")) {
      const parts = url.pathname.split("/"); // ['', 'api', 'snapshots', mode, ?id]
      const mode = parts[3];
      const snapshotId = parts[4];

      if (!mode) return json({ error: "mode required" }, 400);

      const doId = env.BuilderAgent.idFromName(mode);
      const stub = env.BuilderAgent.get(doId);

      // Rewrite to the DO's internal snapshot endpoint
      const internalUrl = snapshotId
        ? `http://do-internal/snapshots/${snapshotId}`
        : `http://do-internal/snapshots`;

      return stub.fetch(new Request(internalUrl, request));
    }

    // Send test email via Resend
    if (url.pathname === "/api/email/send-test" && request.method === "POST") {
      if (!env.RESEND_API_KEY) {
        return json({ error: "RESEND_API_KEY is not configured. Add it as a worker secret." }, 503);
      }

      let body: { to?: unknown; html?: unknown; subject?: unknown };
      try {
        body = await request.json();
      } catch {
        return json({ error: "Invalid JSON body" }, 400);
      }

      const { to, html, subject } = body;
      if (typeof to !== "string" || typeof html !== "string" || typeof subject !== "string") {
        return json({ error: "to, html, and subject are required strings" }, 400);
      }

      const resendResponse = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${env.RESEND_API_KEY}`,
        },
        body: JSON.stringify({
          from: "AI Builder <onboarding@resend.dev>",
          to: [to],
          subject,
          html,
        }),
      });

      const result = await resendResponse.json();
      if (!resendResponse.ok) {
        return json({ error: "Resend API error", details: result }, 500);
      }

      return json({ success: true });
    }

    // Route WebSocket and HTTP requests to the BuilderAgent Durable Object
    return (await routeAgentRequest(request, env)) ?? new Response("Not found", { status: 404 });
  },
};
