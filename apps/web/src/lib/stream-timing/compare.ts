import { analyze, renderStreamMarkdown, sanitizeText } from "./analyze";
import type { StreamAnalysis, StreamMeasurement } from "./types";

export type CompareRow = {
  label: string;
  a: number;
  b: number;
  /** b - a. Negative is faster/better for every row. */
  delta: number;
  unit: "ms" | "%" | "";
};

export function compareAnalyses(a: StreamAnalysis, b: StreamAnalysis): CompareRow[] {
  const row = (label: string, x: number, y: number, unit: CompareRow["unit"] = "ms"): CompareRow => ({
    label,
    a: x,
    b: y,
    delta: Math.round((y - x) * 10) / 10,
    unit,
  });
  return [
    row("TTFB", a.ttfbMs, b.ttfbMs),
    row("First chunk", a.firstChunkMs, b.firstChunkMs),
    row("Last byte", a.lastByteMs, b.lastByteMs),
    row("Idle waiting", a.idleMs, b.idleMs),
    row("Idle share of body", a.idlePct, b.idlePct, "%"),
    row("Longest gap", a.longestGapMs, b.longestGapMs),
    row("Late (Suspense) chunks", a.lateChunkCount, b.lateChunkCount, ""),
  ];
}

const ms = (n: number) => `${Math.round(n)}ms`;
const signed = (n: number, unit: CompareRow["unit"]) =>
  `${n > 0 ? "+" : n < 0 ? "-" : ""}${Math.abs(Math.round(n))}${unit === "%" ? "pp" : unit}`;

/** One-line summary of whether B finishes sooner than A and why. */
export function compareVerdict(a: StreamAnalysis, b: StreamAnalysis): string {
  const d = b.lastByteMs - a.lastByteMs;
  const threshold = Math.max(20, a.lastByteMs * 0.03);
  const head =
    Math.abs(d) < threshold
      ? `B finishes about the same time as A (${ms(a.lastByteMs)} vs ${ms(b.lastByteMs)}).`
      : `B finishes ${ms(Math.abs(d))} ${d < 0 ? "faster" : "slower"} than A (${ms(a.lastByteMs)} -> ${ms(b.lastByteMs)}).`;
  const idle = `Idle waiting ${ms(a.idleMs)} -> ${ms(b.idleMs)}, longest gap ${ms(a.longestGapMs)} -> ${ms(b.longestGapMs)}.`;
  return `${head} ${idle}`;
}

export function renderCompareMarkdown(
  ma: StreamMeasurement,
  mb: StreamMeasurement,
  shareUrl?: string,
): string {
  const a = analyze(ma);
  const b = analyze(mb);
  const rows = compareAnalyses(a, b);
  const lines = [
    "# Streaming timing comparison",
    "",
    `- A: \`${sanitizeText(ma.finalUrl ?? ma.url, 200)}\` (measured from ${ma.measuredFrom})`,
    `- B: \`${sanitizeText(mb.finalUrl ?? mb.url, 200)}\` (measured from ${mb.measuredFrom})`,
    "",
    compareVerdict(a, b),
    "",
    "| Metric | A | B | B - A |",
    "|---|---|---|---|",
    ...rows.map((r) => {
      const fmt = (n: number) => (r.unit === "ms" ? ms(n) : r.unit === "%" ? `${n}%` : String(n));
      return `| ${r.label} | ${fmt(r.a)} | ${fmt(r.b)} | ${signed(r.delta, r.unit)} |`;
    }),
    "",
    "Negative B - A means B is better (faster / less waiting).",
    "",
    "## A",
    "",
    renderStreamMarkdown(ma, a),
    "",
    "## B",
    "",
    renderStreamMarkdown(mb, b),
  ];
  if (shareUrl) lines.push("", `Shareable comparison: ${shareUrl}`);
  return lines.join("\n");
}
