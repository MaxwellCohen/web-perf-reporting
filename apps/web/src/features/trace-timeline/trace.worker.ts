import { parseTraceStream } from "./streamTrace";
import type { ParsedTrace } from "./parseTrace";

export type WorkerIn = { file: File } | { url: string };
export type WorkerOut =
  | { type: "progress"; fraction: number }
  | { type: "done"; trace: ParsedTrace }
  | { type: "error"; message: string };

const ctx = self as unknown as {
  onmessage: ((e: MessageEvent<WorkerIn>) => void) | null;
  postMessage(m: WorkerOut): void;
};

ctx.onmessage = async (e) => {
  try {
    const onProgress = (fraction: number) => ctx.postMessage({ type: "progress", fraction });
    let trace: ParsedTrace;
    if ("file" in e.data) {
      const { file } = e.data;
      trace = await parseTraceStream(file.stream(), file.name.endsWith(".gz"), file.size, onProgress);
    } else {
      const res = await fetch(e.data.url);
      if (!res.ok || !res.body) throw new Error(`Fetch failed: ${res.status}`);
      const gz = e.data.url.split("?")[0].endsWith(".gz");
      trace = await parseTraceStream(res.body, gz, Number(res.headers.get("content-length")) || 0, onProgress);
    }
    ctx.postMessage({ type: "done", trace });
  } catch (err) {
    ctx.postMessage({ type: "error", message: err instanceof Error ? err.message : "Failed to read trace" });
  }
};
