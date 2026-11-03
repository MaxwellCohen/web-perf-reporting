import { TraceBuilder, type ParsedTrace, type TraceEvent } from "./parseTrace";

const QUOTE = 34, BACKSLASH = 92, OPEN_OBJ = 123, CLOSE_OBJ = 125, OPEN_ARR = 91, CLOSE_ARR = 93;

/**
 * Incremental scanner that emits each object of a Chrome trace's event array
 * (a bare `[...]` or `{"traceEvents": [...]}`) without buffering the file.
 */
export class TraceEventScanner {
  private depth = 0;
  private inString = false;
  private escaped = false;
  private key = "";
  private expectArray = false;
  private targetDepth = -1; // depth at which event objects open; -1 = not found yet
  private done = false;
  private pending = ""; // partial event spanning chunks
  private capturing = false;
  private found = false;

  constructor(private onEvent: (e: TraceEvent) => void) {}

  feed(chunk: string) {
    if (this.done) return;
    let capStart = 0;
    const n = chunk.length;
    for (let i = 0; i < n; i++) {
      const c = chunk.charCodeAt(i);
      if (this.inString) {
        if (this.escaped) this.escaped = false;
        else if (c === BACKSLASH) this.escaped = true;
        else if (c === QUOTE) {
          this.inString = false;
          if (this.depth === 1 && this.targetDepth < 0) this.expectArray = this.key === "traceEvents";
        } else if (this.depth === 1 && this.key.length < 32) this.key += chunk[i];
        continue;
      }
      if (c === QUOTE) {
        this.inString = true;
        this.key = "";
      } else if (c === OPEN_OBJ) {
        if (this.depth === this.targetDepth && !this.capturing) {
          this.capturing = true;
          capStart = i;
        }
        this.depth++;
      } else if (c === OPEN_ARR) {
        if (this.targetDepth < 0 && (this.depth === 0 || (this.depth === 1 && this.expectArray))) {
          this.targetDepth = this.depth + 1;
          this.found = true;
        }
        this.depth++;
      } else if (c === CLOSE_OBJ) {
        this.depth--;
        if (this.capturing && this.depth === this.targetDepth) {
          this.capturing = false;
          const text = this.pending + chunk.slice(capStart, i + 1);
          this.pending = "";
          this.onEvent(JSON.parse(text) as TraceEvent);
        }
      } else if (c === CLOSE_ARR) {
        this.depth--;
        if (this.found && this.depth === this.targetDepth - 1) {
          this.done = true;
          return;
        }
      }
    }
    if (this.capturing) {
      this.pending += chunk.slice(capStart);
    }
  }

  end() {
    if (!this.found) throw new Error("Not a Chrome trace: missing traceEvents");
  }
}

export async function parseTraceStream(
  body: ReadableStream<Uint8Array>,
  gzip: boolean,
  total: number,
  onProgress?: (fraction: number) => void,
): Promise<ParsedTrace> {
  let read = 0;
  const counted = body.pipeThrough(
    new TransformStream<Uint8Array, Uint8Array>({
      transform(chunk, ctl) {
        read += chunk.byteLength;
        ctl.enqueue(chunk);
      },
    }),
  );
  const src = gzip ? counted.pipeThrough(new DecompressionStream("gzip") as unknown as TransformStream<Uint8Array, Uint8Array>) : counted;
  const reader = src.getReader();
  const decoder = new TextDecoder();
  const builder = new TraceBuilder();
  const scanner = new TraceEventScanner((e) => builder.add(e));
  let lastReport = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    scanner.feed(decoder.decode(value, { stream: true }));
    const now = performance.now();
    if (total && onProgress && now - lastReport > 100) {
      lastReport = now;
      onProgress(Math.min(1, read / total));
    }
  }
  scanner.feed(decoder.decode());
  scanner.end();
  return builder.finish();
}
