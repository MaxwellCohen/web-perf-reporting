import { describe, expect, it } from "vitest";
import { buildShareUrl, decodeSnapshot, encodeSnapshot, hasShareHash } from "./shareFindings";
import { heavySnapshot } from "./testSnapshot";

describe("shareFindings", () => {
  it("roundtrips the summary", async () => {
    const s = heavySnapshot();
    const out = await decodeSnapshot(`#r=${await encodeSnapshot(s)}`);
    expect(out?.metrics.longTaskCount).toBe(s.metrics.longTaskCount);
    expect(out?.findings.map((f) => f.title)).toEqual(s.findings.map((f) => f.title));
    expect(out?.topScripts[0].url).toBe("https://x.test/app.js");
    expect(out?.categoryMs.script).toBeCloseTo(s.categoryMs.script, 0);
  });

  it("rejects garbage and schema violations", async () => {
    expect(await decodeSnapshot("#r=!!!")).toBeNull();
    expect(await decodeSnapshot("#r=abcd")).toBeNull();
    expect(await decodeSnapshot("#other")).toBeNull();
    expect(await decodeSnapshot("")).toBeNull();
  });

  it("detects the hash key", () => {
    expect(hasShareHash("#r=abc")).toBe(true);
    expect(hasShareHash("#x=abc")).toBe(false);
  });

  it("keeps the url under the cap", async () => {
    const s = heavySnapshot();
    const rnd = (i: number) => Math.abs(Math.sin(i * 12.9898) * 43758.5453) % 1;
    s.topScripts = Array.from({ length: 10 }, (_, i) => ({
      url: `https://cdn.test/${rnd(i).toString(36).slice(2)}${rnd(i + 99)
        .toString(36)
        .slice(2)}.js`,
      ms: 100 + i,
      count: i,
      blockingMs: i,
    }));
    const url = await buildShareUrl("http://localhost", s, 700);
    expect(url.startsWith("http://localhost/trace#r=")).toBe(true);
    expect(url.length).toBeLessThanOrEqual(700);
    expect(await decodeSnapshot(new URL(url).hash)).not.toBeNull();
  });
});
