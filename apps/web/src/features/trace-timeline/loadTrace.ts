import type { ParsedTrace } from "./parseTrace";
import type { WorkerIn, WorkerOut } from "./trace.worker";

/** Parse a trace file/URL in a Web Worker, streaming so size is bounded by retained data, not file size. */
export function loadTrace(input: File | string, onProgress?: (fraction: number) => void): Promise<ParsedTrace> {
  return new Promise((resolve, reject) => {
    const worker = new Worker(new URL("./trace.worker.ts", import.meta.url));
    const finish = () => worker.terminate();
    worker.onmessage = (e: MessageEvent<WorkerOut>) => {
      const m = e.data;
      if (m.type === "progress") onProgress?.(m.fraction);
      else {
        finish();
        if (m.type === "done") resolve(m.trace);
        else reject(new Error(m.message));
      }
    };
    worker.onerror = (e) => {
      finish();
      reject(new Error(e.message || "Trace worker failed"));
    };
    const msg: WorkerIn = typeof input === "string" ? { url: new URL(input, window.location.href).href } : { file: input };
    worker.postMessage(msg);
  });
}
