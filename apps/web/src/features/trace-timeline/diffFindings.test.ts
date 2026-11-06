import { describe, expect, it } from "vitest";
import { diffFindings } from "./diffFindings";
import { heavySnapshot } from "./testSnapshot";

describe("diffFindings", () => {
  it("reports negative deltas for improvements", () => {
    const d = diffFindings(
      heavySnapshot("https://x.test/app.js", 600),
      heavySnapshot("https://x.test/app.js", 100),
    );
    const tbt = d.metrics.find((m) => m.label === "TBT")!;
    expect(tbt.delta).toBeLessThan(0);
    expect(d.categories.find((c) => c.label === "script")!.delta).toBeCloseTo(-500);
    expect(d.scripts[0].delta).toBeCloseTo(-500);
  });

  it("unions scripts and gives null delta for missing metrics", () => {
    const a = heavySnapshot("https://x.test/a.js");
    const b = heavySnapshot("https://x.test/b.js");
    b.metrics.lcp = undefined;
    const d = diffFindings(a, b);
    expect(d.scripts.map((s) => s.label).sort()).toEqual([
      "https://x.test/a.js",
      "https://x.test/b.js",
    ]);
    expect(d.metrics.find((m) => m.label === "LCP")!.delta).toBeNull();
  });
});
