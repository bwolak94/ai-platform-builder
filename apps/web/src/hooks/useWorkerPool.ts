/**
 * WorkerPool — executes untrusted JavaScript in isolated Web Workers.
 *
 * Architecture:
 * - Max 2 concurrent workers; excess requests queue.
 * - Each job gets a dedicated Worker that is terminated after completion.
 * - 5-second hard timeout per job, enforced via `setTimeout` + `worker.terminate()`.
 * - Worker source is embedded as a Blob URL so no separate file bundling is needed.
 * - console.log inside the user's code is captured and returned as output lines.
 */

const WORKER_SOURCE = `
self.addEventListener('message', function(evt) {
  var id = evt.data.id;
  var code = evt.data.code;
  var logs = [];
  var origLog = console.log;
  console.log = function() {
    var args = Array.prototype.slice.call(arguments);
    logs.push(args.map(function(a) {
      try { return typeof a === 'object' ? JSON.stringify(a) : String(a); }
      catch(_) { return String(a); }
    }).join(' '));
  };
  try {
    // eslint-disable-next-line no-new-func
    var fn = new Function(code);
    var returned = fn();
    var lines = logs.slice();
    if (returned !== undefined) lines.push('\\u2192 ' + JSON.stringify(returned));
    var output = lines.filter(Boolean).join('\\n') || '(no output)';
    self.postMessage({ id: id, output: output });
  } catch(err) {
    self.postMessage({ id: id, error: err instanceof Error ? err.message : 'Execution failed' });
  } finally {
    console.log = origLog;
  }
});
`;

interface JobResult {
  output?: string;
  error?: string;
}

interface PendingJob {
  execute: () => void;
}

class WorkerPool {
  private inFlight = 0;
  private readonly max: number;
  private readonly queue: PendingJob[] = [];

  constructor(max = 2) {
    this.max = max;
  }

  run(code: string): Promise<JobResult> {
    return new Promise<JobResult>((resolve) => {
      const execute = (): void => {
        this.inFlight++;

        const blob = new Blob([WORKER_SOURCE], { type: "text/javascript" });
        const url = URL.createObjectURL(blob);
        const worker = new Worker(url);
        URL.revokeObjectURL(url);

        const jobId = crypto.randomUUID();

        const timeoutId = setTimeout(() => {
          worker.terminate();
          this.release();
          resolve({ error: "Execution timeout (5s)" });
        }, 5000);

        worker.onmessage = (
          evt: MessageEvent<{ id: string; output?: string; error?: string }>
        ): void => {
          if (evt.data.id !== jobId) return;
          clearTimeout(timeoutId);
          worker.terminate();
          this.release();
          const result: JobResult = {};
          if (evt.data.output !== undefined) result.output = evt.data.output;
          if (evt.data.error !== undefined) result.error = evt.data.error;
          resolve(result);
        };

        worker.onerror = (err: ErrorEvent): void => {
          clearTimeout(timeoutId);
          worker.terminate();
          this.release();
          resolve({ error: err.message });
        };

        worker.postMessage({ id: jobId, code });
      };

      if (this.inFlight < this.max) {
        execute();
      } else {
        this.queue.push({ execute });
      }
    });
  }

  private release(): void {
    this.inFlight--;
    const next = this.queue.shift();
    if (next) next.execute();
  }
}

// Module-level singleton — shared across all React renders
export const workerPool = new WorkerPool(2);
