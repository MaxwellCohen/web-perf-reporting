import { describe, expect, it } from "vitest";
import { analyzeLoad } from "./analyzeLoad";
import { buildFindings } from "./findings";
import { parseTrace } from "./parseTrace";
import { heavyTrace } from "./testSnapshot";

describe("buildFindings", () => {
  const trace = heavyTrace();
  const r = buildFindings(trace, analyzeLoad(trace));
  const titles = r.findings.map((f) => f.title).join("\n");

  it("flags the expected problems, highest severity first", () => {
    expect(titles).toMatch(/over 200 ms/);
    expect(titles).toMatch(/One script is/);
    expect(titles).toMatch(/Forced synchronous layout/);
    expect(titles).toMatch(/Garbage collection/);
    expect(titles).toMatch(/Cumulative Layout Shift/);
    expect(titles).toMatch(/Largest Contentful Paint/);
    expect(titles).toMatch(/Total blocking time/);
    const rank = { high: 0, medium: 1, low: 2 };
    const sev = r.findings.map((f) => rank[f.severity]);
    expect(sev).toEqual([...sev].sort());
  });

  it("buckets main-thread time and attributes blocking to scripts", () => {
    expect(r.categoryMs.script).toBeCloseTo(600);
    expect(r.categoryMs.gc).toBeCloseTo(150);
    expect(r.topScripts[0].url).toBe("https://x.test/app.js");
    expect(r.topScripts[0].blockingMs).toBeCloseTo(550);
    expect(r.layoutShifts).toHaveLength(1);
  });

  it("returns nothing for a quiet trace", () => {
    const t = parseTrace({
      traceEvents: [
        { name: "thread_name", ph: "M", pid: 1, tid: 2, ts: 0, args: { name: "CrRendererMain" } },
        { name: "RunTask", ph: "X", pid: 1, tid: 2, ts: 1000, dur: 10_000 },
      ],
    });
    expect(buildFindings(t, analyzeLoad(t)).findings).toEqual([]);
  });
});
