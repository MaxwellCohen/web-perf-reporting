import { categorize, LONG_TASK_MS, type ParsedTrace, type Slice } from "./parseTrace";
import { shortUrl, type LoadAnalysis } from "./analyzeLoad";

export type Severity = "high" | "medium" | "low";
export type Finding = { severity: Severity; title: string; detail: string };
export const FINDING_CATEGORIES = ["script", "layout", "paint", "gc", "other"] as const;
export type FindingCategory = (typeof FINDING_CATEGORIES)[number];
export type CategoryMs = Record<FindingCategory, number>;
export type FindingScript = { url: string; ms: number; count: number; blockingMs: number };
export type FindingShift = { timeMs: number; score: number; nodes: string[] };
export type FindingsResult = {
  findings: Finding[];
  categoryMs: CategoryMs;
  topScripts: FindingScript[];
  layoutShifts: FindingShift[];
};

/** Compact, serialisable view of one trace: what the panel, compare view and share link all use. */
export type TraceSnapshot = {
  url?: string;
  metrics: {
    ttfb?: number;
    fcp?: number;
    lcp?: number;
    cls: number;
    tbt: number;
    longTaskCount: number;
    longTaskMs: number;
  };
  categoryMs: CategoryMs;
  topScripts: FindingScript[];
  findings: Finding[];
  layoutShifts: FindingShift[];
};

const SCRIPT_NAMES = new Set(["EvaluateScript", "v8.compile", "v8.run", "FunctionCall"]);
const FORCED_LAYOUT = new Set(["Layout", "UpdateLayoutTree"]);
const RANK: Record<Severity, number> = { high: 0, medium: 1, low: 2 };
const ms = (n: number) => `${Math.round(n)} ms`;

function sliceUrl(s: Slice): string | undefined {
  const d = (s.args?.data ?? {}) as { url?: string };
  return d.url || (s.args as { fileName?: string } | undefined)?.fileName || undefined;
}

/** Layout/style work that runs nested inside a script slice (forced synchronous layout). */
function forcedLayoutMs(main: Slice[], origin: number): number {
  const sorted = main
    .filter((s) => s.start >= origin)
    .sort((a, b) => a.start - b.start || a.depth - b.depth);
  const stack: Slice[] = [];
  let total = 0;
  for (const s of sorted) {
    stack.length = s.depth;
    stack[s.depth] = s;
    if (s.depth > 0 && FORCED_LAYOUT.has(s.name)) {
      const ancestors = stack.slice(0, s.depth);
      if (
        ancestors.some((a) => SCRIPT_NAMES.has(a.name)) &&
        !ancestors.some((a) => FORCED_LAYOUT.has(a.name))
      )
        total += s.dur;
    }
  }
  return total;
}

export function buildFindings(trace: ParsedTrace, load: LoadAnalysis): FindingsResult {
  const origin = trace.navigation?.time ?? 0;
  const main = trace.tracks[0]?.slices ?? [];

  const categoryMs: CategoryMs = { script: 0, layout: 0, paint: 0, gc: 0, other: 0 };
  for (const s of main) {
    if (s.depth !== 0 || s.start < origin) continue;
    const c = categorize(s.name);
    categoryMs[c === "network" ? "other" : c] += s.dur;
  }
  const busy = FINDING_CATEGORIES.reduce((a, c) => a + categoryMs[c], 0);

  // Blocking ms (dur - 50) per script: attributed to the heaviest script slice inside each long task.
  const scriptSlices = main.filter(
    (s) => s.start >= origin && SCRIPT_NAMES.has(s.name) && sliceUrl(s),
  );
  const blocking = new Map<string, number>();
  const longTasks = trace.longTasks.filter((t) => t.start >= origin);
  for (const t of longTasks) {
    let top: Slice | undefined;
    for (const s of scriptSlices) {
      if (
        s.start >= t.start &&
        s.start + s.dur <= t.start + t.dur + 0.01 &&
        (!top || s.dur > top.dur)
      )
        top = s;
    }
    const url = top && sliceUrl(top);
    if (url) blocking.set(url, (blocking.get(url) ?? 0) + t.dur - LONG_TASK_MS);
  }
  const topScripts: FindingScript[] = load.scripts.map((s) => ({
    ...s,
    blockingMs: blocking.get(s.url) ?? 0,
  }));

  const layoutShifts: FindingShift[] = trace.layoutShifts
    .filter((s) => !s.hadInput && s.time >= origin)
    .map((s) => ({ timeMs: s.time - origin, score: s.score, nodes: s.nodes.slice(0, 3) }));

  const findings: Finding[] = [];

  const over200 = longTasks.filter((t) => t.dur > 200);
  if (over200.length) {
    const worst = over200.reduce((m, t) => (t.dur > m.dur ? t : m));
    findings.push({
      severity: worst.dur >= 500 || over200.length >= 5 ? "high" : "medium",
      title: `${over200.length} main-thread task${over200.length === 1 ? "" : "s"} over 200 ms`,
      detail: `Longest is ${ms(worst.dur)} at ${ms(worst.start - origin)}. Break up long work, defer non-critical scripts, or move it off the main thread.`,
    });
  }

  const top = topScripts[0];
  if (top && categoryMs.script >= 200 && top.ms / categoryMs.script > 0.3) {
    const pct = Math.round((top.ms / categoryMs.script) * 100);
    findings.push({
      severity: pct > 50 ? "high" : "medium",
      title: `One script is ${pct}% of scripting time`,
      detail: `${shortUrl(top.url, 80)} spends ${ms(top.ms)} of ${ms(categoryMs.script)} scripting. Split, defer, or remove it.`,
    });
  }

  const forced = forcedLayoutMs(main, origin);
  if (forced >= 100) {
    findings.push({
      severity: forced >= 300 ? "high" : "medium",
      title: "Forced synchronous layout",
      detail: `${ms(forced)} of layout/style work ran inside script. Batch layout reads (offsetHeight, getBoundingClientRect) before DOM writes.`,
    });
  }

  if (busy > 0 && categoryMs.gc >= 100 && categoryMs.gc / busy > 0.1) {
    const pct = Math.round((categoryMs.gc / busy) * 100);
    findings.push({
      severity: pct > 20 ? "high" : "medium",
      title: `Garbage collection is ${pct}% of main-thread time`,
      detail: `${ms(categoryMs.gc)} spent in GC. Reduce allocation churn and reuse objects.`,
    });
  }

  if (load.cls > 0.1) {
    findings.push({
      severity: load.cls > 0.25 ? "high" : "medium",
      title: `Cumulative Layout Shift ${load.cls.toFixed(3)}`,
      detail: `${layoutShifts.length} shift${layoutShifts.length === 1 ? "" : "s"} without recent input. Reserve space for images, embeds, and late-injected content.`,
    });
  }

  if (load.lcp != null && load.lcp > 2500) {
    const node = trace.lcpCandidates.at(-1)?.detail;
    findings.push({
      severity: load.lcp > 4000 ? "high" : "medium",
      title: `Largest Contentful Paint ${ms(load.lcp)}`,
      detail: `Above the 2.5 s good threshold${node ? ` (element: ${node})` : ""}. Check resource load delay, server response, and render-blocking work.`,
    });
  }

  if (load.blockingMs > 200) {
    findings.push({
      severity: load.blockingMs > 600 ? "high" : "medium",
      title: `Total blocking time ${ms(load.blockingMs)}`,
      detail:
        "Long tasks after first paint delay input handling. Prioritise the longest tasks and heaviest scripts first.",
    });
  }

  findings.sort((a, b) => RANK[a.severity] - RANK[b.severity]);
  return { findings, categoryMs, topScripts, layoutShifts };
}

export function buildSnapshot(trace: ParsedTrace, load: LoadAnalysis): TraceSnapshot {
  const origin = trace.navigation?.time ?? 0;
  const r = buildFindings(trace, load);
  const tasks = trace.longTasks.filter((t) => t.start >= origin);
  return {
    url: load.navUrl,
    metrics: {
      ttfb: load.ttfb,
      fcp: load.fcp,
      lcp: load.lcp,
      cls: load.cls,
      tbt: load.blockingMs,
      longTaskCount: tasks.length,
      longTaskMs: tasks.reduce((a, t) => a + t.dur, 0),
    },
    categoryMs: r.categoryMs,
    topScripts: r.topScripts,
    findings: r.findings,
    layoutShifts: r.layoutShifts,
  };
}
