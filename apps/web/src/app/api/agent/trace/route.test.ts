import { describe, expect, it } from "vitest";

import { GET, POST } from "@/app/api/agent/trace/route";

const post = (body: string, query = "") =>
  POST(new Request(`http://x/api/agent/trace${query}`, { method: "POST", body }));

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

  it("400s on non-JSON bodies", async () => {
    expect((await post("nope")).status).toBe(400);
  });

  it("GET explains usage", async () => {
    expect((await GET(new Request("http://x/api/agent/trace"))).status).toBe(405);
  });
});
