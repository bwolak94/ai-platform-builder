import { routeAgentRequest } from "@cloudflare/agents";
import type { Env } from "./types";
export { BuilderAgent } from "./agent";

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    // Health check
    if (url.pathname === "/" && request.method === "GET") {
      return new Response(JSON.stringify({ status: "ok", service: "ai-builder" }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    // Route WebSocket and HTTP requests to the BuilderAgent Durable Object
    return (await routeAgentRequest(request, env)) ?? new Response("Not found", { status: 404 });
  },
};
