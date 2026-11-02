import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { estimateFromAudits } from "./estimateFromReport";

const dir = join(__dirname, "fixtures");
const fixtures = readdirSync(dir)
  .filter((file) => file.endsWith(".json"))
  .map((file) => {
    const report = JSON.parse(readFileSync(join(dir, file), "utf8"));
    return { name: file.replace(".json", ""), report };
  });

const relativeError = (sim: number, lighthouse: number) => Math.abs(sim - lighthouse) / lighthouse;

/**
 * Real PageSpeed reports (trimmed to the audits the estimator reads), scored
 * against Lighthouse's own simulated FCP and LCP. Bounds guard against the
 * estimator drifting; tighten them as the model improves.
 */
describe("Lantern-style FCP/LCP estimate vs Lighthouse", () => {
  const results = fixtures.map(({ name, report }) => ({
    name,
    ...estimateFromAudits(report.audits, report.formFactor)!,
  }));

  it("covers every fixture", () => {
    expect(results.length).toBeGreaterThanOrEqual(8);
    for (const result of results) expect(result.estimate).toBeDefined();
  });

  it.each(fixtures.map((f) => f.name))("%s stays within 60% of Lighthouse", (name) => {
    const result = results.find((r) => r.name === name)!;
    expect(relativeError(result.estimate.fcp.timing, result.lighthouse.fcp)).toBeLessThan(0.6);
    const lcp = result.estimate.lcp ?? result.estimate.fcp;
    expect(relativeError(lcp.timing, result.lighthouse.lcp)).toBeLessThan(0.6);
  });

  it("is within 30% of Lighthouse on average", () => {
    const errors = results.flatMap((r) => [
      relativeError(r.estimate.fcp.timing, r.lighthouse.fcp),
      relativeError((r.estimate.lcp ?? r.estimate.fcp).timing, r.lighthouse.lcp),
    ]);
    expect(errors.reduce((sum, e) => sum + e, 0) / errors.length).toBeLessThan(0.3);
  });
});
