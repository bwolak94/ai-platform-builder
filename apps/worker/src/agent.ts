// Placeholder — full implementation in TASK-005
export class BuilderAgent {
  state: DurableObjectState;

  constructor(state: DurableObjectState) {
    this.state = state;
  }

  fetch(_request: Request): Response {
    return new Response("BuilderAgent — not yet implemented", { status: 501 });
  }
}
