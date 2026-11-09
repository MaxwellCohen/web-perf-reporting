import { gzipSync } from "node:zlib";
import { describe, expect, it } from "vitest";

import { GET, POST } from "@/app/api/agent/trace/route";

const post = (body: string, query = "") =>
  POST(new Request(`http://x/api/agent/trace${query}`, { method: "POST", body }));

const gzipPost = (body: string, query = "") =>
  POST(new Request(`http://x/api/agent/trace${query}`, { method: "POST", body: gzipSync(Buffer.from(body)) }));

const trace = [
  { name: "thread_name", ph: "M", pid: 1, tid: 1, ts: 0, args: { name: "CrRendererMain" } },
  { name: "RunTask", ph: "X", pid: 1, tid: 1, ts: 1000, dur: 300_000, cat: "toplevel", args: {} },
];

describe("POST /api/agent/trace", () => {
  it("returns metrics and a brief as JSON", async () => {
    const res = await post(JSON.stringify(trace));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toHaveProperty("metrics");
    expect(typeof json.brief).toBe("string");
  });

  it("returns the fix prompt as markdown on request", async () => {
    const res = await post(JSON.stringify(trace), "?format=md");
    expect(res.headers.get("content-type")).toContain("text/markdown");
  });

  it("accepts gzipped traces", async () => {
    const res = await gzipPost(JSON.stringify(trace));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toHaveProperty("insights");
  });

  it("413s when the upload exceeds 4 MB", async () => {
    expect((await post("x".repeat(4 * 1024 * 1024 + 1))).status).toBe(413);
  });

  it("413s when the decompressed body exceeds 24 MB", async () => {
    expect((await gzipPost(JSON.stringify("x".repeat(25 * 1024 * 1024)))).status).toBe(413);
  });

  it("400s on non-JSON bodies", async () => {
    expect((await post("nope")).status).toBe(400);
  });

  it("400s on a gzip body that is not valid JSON", async () => {
    expect((await gzipPost("nope")).status).toBe(400);
  });

  it("GET explains usage", async () => {
    expect((await GET(new Request("http://x/api/agent/trace"))).status).toBe(405);
  });
});
