// BuilderAgent Durable Object — implemented in TASK-005
export { BuilderAgent } from "./agent";

export default {
  fetch(_request: Request, _env: unknown): Response {
    return new Response("AI Builder Worker — ready", { status: 200 });
  },
};
