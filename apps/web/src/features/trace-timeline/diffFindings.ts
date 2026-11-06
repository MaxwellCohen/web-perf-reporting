import { FINDING_CATEGORIES, type TraceSnapshot } from "./findings";

export type Delta = {
  label: string;
  before?: number;
  after?: number;
  delta: number | null;
  unit: "ms" | "" | "count";
  digits: number;
};
export type SnapshotDiff = { metrics: Delta[]; categories: Delta[]; scripts: Delta[] };

function delta(
  label: string,
  before: number | undefined,
  after: number | undefined,
  unit: Delta["unit"] = "ms",
  digits = 0,
): Delta {
  return {
    label,
    before,
    after,
    delta: before == null || after == null ? null : after - before,
    unit,
    digits,
  };
}

/** Lower is better for every delta: negative = improvement. */
export function diffFindings(
  before: TraceSnapshot,
  after: TraceSnapshot,
  maxScripts = 8,
): SnapshotDiff {
  const b = before.metrics;
  const a = after.metrics;
  const metrics = [
    delta("Long tasks", b.longTaskCount, a.longTaskCount, "count"),
    delta("Long task time", b.longTaskMs, a.longTaskMs),
    delta("TBT", b.tbt, a.tbt),
    delta("FCP", b.fcp, a.fcp),
    delta("LCP", b.lcp, a.lcp),
    delta("CLS", b.cls, a.cls, "", 3),
  ];
  const categories = FINDING_CATEGORIES.map((c) =>
    delta(c, before.categoryMs[c], after.categoryMs[c]),
  );
  const urls = new Set([...before.topScripts, ...after.topScripts].map((s) => s.url));
  const ms = (snap: TraceSnapshot, url: string) =>
    snap.topScripts.find((s) => s.url === url)?.ms ?? 0;
  const scripts = [...urls]
    .map((u) => delta(u, ms(before, u), ms(after, u)))
    .sort((x, y) => Math.abs(y.delta ?? 0) - Math.abs(x.delta ?? 0))
    .slice(0, maxScripts);
  return { metrics, categories, scripts };
}
