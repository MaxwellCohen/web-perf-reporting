import { describe, expect, it } from "vitest";
import { TraceBuilder, parseTrace, type TraceEvent } from "./parseTrace";
import { TraceEventScanner, parseTraceStream } from "./streamTrace";

const events = [
  { name: "thread_name", ph: "M", pid: 1, tid: 2, ts: 0, args: { name: "CrRendererMain" } },
  { name: "RunTask", ph: "X", pid: 1, tid: 2, ts: 1000, dur: 80000 },
  { name: "FunctionCall", ph: "X", pid: 1, tid: 2, ts: 1000, dur: 40000, args: { s: 'a"}{]\\' } },
  { name: "firstContentfulPaint", ph: "R", pid: 1, tid: 2, ts: 50000 },
];

function scan(text: string, size: number) {
  const b = new TraceBuilder();
  const sc = new TraceEventScanner((e: TraceEvent) => b.add(e));
  for (let i = 0; i < text.length; i += size) sc.feed(text.slice(i, i + size));
  sc.end();
  return b.finish();
}

describe("TraceEventScanner", () => {
  const want = parseTrace({ traceEvents: events });
  for (const size of [1, 7, 1000]) {
    it(`matches parseTrace for object form, chunk ${size}`, () => {
      const text = JSON.stringify({ metadata: { a: [{ x: 1 }] }, traceEvents: events, tail: [{ y: 2 }] });
      expect(scan(text, size)).toEqual(want);
    });
    it(`matches parseTrace for bare array, chunk ${size}`, () => {
      expect(scan(JSON.stringify(events), size)).toEqual(want);
    });
  }
  it("rejects non-traces", () => {
    expect(() => scan('{"a":1}', 3)).toThrow(/missing traceEvents/);
  });
});

describe("parseTraceStream gzip sniffing", () => {
  const text = JSON.stringify({ traceEvents: events });
  const toStream = (bytes: Uint8Array) =>
    new ReadableStream<Uint8Array>({
      start(c) {
        c.enqueue(bytes);
        c.close();
      },
    });
  it("detects gzip by magic bytes even without a .gz hint", async () => {
    const gz = toStream(new TextEncoder().encode(text)).pipeThrough(new CompressionStream("gzip") as unknown as TransformStream<Uint8Array, Uint8Array>);
    const bytes = new Uint8Array(await new Response(gz).arrayBuffer());
    const parsed = await parseTraceStream(toStream(bytes), false, 0);
    expect(parsed).toEqual(parseTrace({ traceEvents: events }));
  });
  it("parses plain text even when the hint says gzip", async () => {
    const parsed = await parseTraceStream(toStream(new TextEncoder().encode(text)), true, 0);
    expect(parsed).toEqual(parseTrace({ traceEvents: events }));
  });
});
