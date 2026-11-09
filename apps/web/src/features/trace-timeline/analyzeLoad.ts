import { clsScore } from "./cls";
import { categorize, LONG_TASK_MS, type Category, type CpuProfile, type ParsedTrace, type Slice } from "./parseTrace";

export type Tone = "good" | "warn" | "bad" | "info";
export type KeyEvent = {
  /** ms since navigation start */
  time: number;
  kind: "navigation" | "network" | "parse" | "script" | "paint" | "lcp" | "shift" | "task" | "load";
  title: string;
  detail?: string;
  tone: Tone;
  /** [start, end] in ms since navigation start, for events that span time (tasks, scripts, handlers). */
  window?: [number, number];
};
export type Phase = {
  label: string;
  start: number;
  end: number;
  byCategory: Partial<Record<Category, number>>;
};
export type ScriptCost = { url: string; ms: number; count: number };
export type HotFunction = { fn: string; url: string; line: number; ms: number };
export type LoadAnalysis = {
  hotFunctions: HotFunction[];
  navUrl?: string;
  ttfb?: number;
  fcp?: number;
  lcp?: number;
  cls: number;
  blockingMs: number;
  events: KeyEvent[];
  phases: Phase[];
  scripts: ScriptCost[];
};

const SCRIPT_NAMES = new Set(["EvaluateScript", "v8.compile", "v8.run", "FunctionCall"]);

function sliceUrl(s: Slice): string | undefined {
  const d = (s.args?.data ?? {}) as { url?: string };
  const u = d.url || (s.args as { fileName?: string } | undefined)?.fileName;
  return u || undefined;
}

export function shortUrl(u: string, max = 60) {
  try {
    const x = new URL(u);
    const p = x.pathname.split("/").filter(Boolean).pop() ?? x.pathname;
    return `${x.host}/…/${p}`.slice(0, max);
  } catch {
    return u.slice(0, max);
  }
}

function toneFor(value: number, good: number, bad: number): Tone {
  return value <= good ? "good" : value <= bad ? "warn" : "bad";
}

const IDLE = new Set(["(idle)", "(program)", "(root)"]);

/** Self time per function (name+url+line) over [from, to] ms, heaviest first. */
export function hotFunctions(p: CpuProfile | undefined, from: number, to: number, n = 5): HotFunction[] {
  if (!p) return [];
  // Binary search first sample >= from.
  let lo = 0, hi = p.times.length;
  while (lo < hi) { const m = (lo + hi) >> 1; if (p.times[m] < from) lo = m + 1; else hi = m; }
  const acc = new Map<string, HotFunction>();
  for (let i = lo; i < p.times.length && p.times[i] <= to; i++) {
    const node = p.nodes.get(p.nodeIds[i]);
    if (!node || IDLE.has(node.fn) || node.url.startsWith("chrome-extension://")) continue;
    const key = `${node.fn}|${node.url}|${node.line}`;
    const h = acc.get(key) ?? { fn: node.fn, url: node.url, line: node.line, ms: 0 };
    h.ms += p.weights[i];
    acc.set(key, h);
  }
  return [...acc.values()].sort((a, b) => b.ms - a.ms).slice(0, n);
}

export function fnLabel(h: HotFunction) {
  return `${h.fn}${h.url ? ` · ${shortUrl(h.url, 40)}:${h.line + 1}` : ""}`;
}

export function analyzeLoad(trace: ParsedTrace): LoadAnalysis {
  const origin = trace.navigation?.time ?? 0;
  const rel = (t: number) => t - origin;
  const main = trace.tracks[0]?.slices ?? [];
  const events: KeyEvent[] = [];
  const mark = (name: string) => trace.markers.find((m) => m.name === name);

  if (trace.navigation) {
    events.push({ time: 0, kind: "navigation", title: "Navigation starts", detail: trace.navigation.url, tone: "info" });
  }

  // Server response
  const doc = trace.requests.find((r) => r.resourceType === "Document" && r.start >= origin - 5);
  let ttfb: number | undefined;
  if (doc?.headersAt != null) {
    ttfb = rel(doc.headersAt);
    events.push({
      time: ttfb,
      kind: "network",
      title: `Server responds · TTFB ${Math.round(ttfb)} ms`,
      detail: [doc.protocol, doc.statusCode && `HTTP ${doc.statusCode}`].filter(Boolean).join(" · ") || undefined,
      tone: toneFor(ttfb, 800, 1800),
    });
  }

  // HTML parsing
  const parse = main.filter((s) => s.name === "ParseHTML" && s.start >= origin);
  if (parse.length) {
    const ms = parse.reduce((a, s) => a + s.dur, 0);
    events.push({ time: rel(parse[0].start), kind: "parse", title: "HTML parsing starts", detail: `${parse.length} parse chunks, ${Math.round(ms)} ms total`, tone: "info" });
  }

  // Render-blocking resources (same predicate as the insights panel).
  const firstPaint = mark("firstPaint");
  const blocking = trace.requests.filter(
    (r) =>
      r.start >= origin &&
      (r.renderBlocking === "blocking" || r.renderBlocking === "in_body_parser_blocking") &&
      (firstPaint == null || r.end <= firstPaint.time + 0.5),
  );
  if (blocking.length) {
    const last = Math.max(...blocking.map((r) => r.end));
    events.push({ time: rel(last), kind: "network", title: `Render-blocking resources done (${blocking.length})`, detail: blocking.slice(0, 4).map((r) => shortUrl(r.url, 40)).join(", ") + (blocking.length > 4 ? "…" : ""), tone: "info" });
  }

  // Scripts
  const byUrl = new Map<string, ScriptCost>();
  for (const s of main) {
    if (s.start < origin || !SCRIPT_NAMES.has(s.name)) continue;
    const url = sliceUrl(s);
    if (!url || url.startsWith("chrome-extension://")) continue;
    if (s.name === "FunctionCall" && s.depth > 3) continue;
    const c = byUrl.get(url) ?? { url, ms: 0, count: 0 };
    c.ms += s.name === "v8.run" ? 0 : s.dur;
    c.count++;
    byUrl.set(url, c);
  }
  const scripts = [...byUrl.values()].sort((a, b) => b.ms - a.ms).slice(0, 8);
  for (const s of main) {
    if (s.start < origin || s.name !== "EvaluateScript" || s.dur < 40) continue;
    const url = sliceUrl(s);
    if (!url || url.startsWith("chrome-extension://")) continue;
    events.push({ time: rel(s.start), kind: "script", title: `Script runs · ${Math.round(s.dur)} ms`, detail: shortUrl(url, 70), tone: toneFor(s.dur, 50, 200), window: [rel(s.start), rel(s.start + s.dur)] });
  }

  // Paints
  const fp = mark("firstPaint");
  const fcp = mark("firstContentfulPaint");
  if (fp && fcp && Math.abs(fp.time - fcp.time) > 1) events.push({ time: rel(fp.time), kind: "paint", title: "First paint", tone: "info" });
  if (fcp) events.push({ time: rel(fcp.time), kind: "paint", title: `First contentful paint · ${Math.round(rel(fcp.time))} ms`, tone: toneFor(rel(fcp.time), 1800, 3000) });

  // LCP candidates — the last one is the final LCP.
  trace.lcpCandidates.forEach((c, i) => {
    const last = i === trace.lcpCandidates.length - 1;
    events.push({
      time: rel(c.time),
      kind: "lcp",
      title: last ? `Largest contentful paint · ${Math.round(rel(c.time))} ms` : "LCP candidate (replaced later)",
      detail: c.detail,
      tone: last ? toneFor(rel(c.time), 2500, 4000) : "info",
    });
  });

  // Layout shifts. CLS is the worst session window, matching the insights card
  // and Chrome's `sessionMaxScore` — not the sum of every shift.
  const shifts = trace.layoutShifts.filter((sh) => sh.time >= origin);
  const cls = clsScore(shifts);
  for (const sh of shifts) {
    events.push({ time: rel(sh.time), kind: "shift", title: `Layout shift · ${sh.score.toFixed(4)}`, detail: sh.nodes.slice(0, 2).join(" · ") || undefined, tone: toneFor(sh.score, 0.01, 0.1) });
  }

  // Long tasks with their heaviest contributor
  let blockingMs = 0;
  const afterFcp = fcp?.time ?? origin;
  for (const t of trace.longTasks) {
    if (t.start < origin) continue;
    if (t.start >= afterFcp) blockingMs += t.dur - LONG_TASK_MS;
    let top: Slice | undefined;
    for (const s of main) {
      if (s.start >= t.start && s.start + s.dur <= t.start + t.dur + 0.01 && s.depth >= 0 && (!top || s.dur > top.dur)) top = s;
    }
    const url = top && sliceUrl(top);
    const hot = hotFunctions(trace.profile, t.start, t.start + t.dur, 3).filter((h) => h.ms >= 5);
    events.push({
      time: rel(t.start),
      kind: "task",
      title: `Long task · ${Math.round(t.dur)} ms`,
      detail: [top ? `${top.name}${url ? ` · ${shortUrl(url, 60)}` : ""}` : "", hot.length ? `hot: ${hot.map((h) => `${fnLabel(h)} ${Math.round(h.ms)} ms`).join("; ")}` : ""].filter(Boolean).join(" — ") || undefined,
      tone: t.dur > 200 ? "bad" : "warn",
      window: [rel(t.start), rel(t.start + t.dur)],
    });
  }

  // Input handlers (click, key, pointer) that held up the main thread.
  for (const s of main) {
    if (s.start < origin || s.name !== "EventDispatch" || s.dur < 16) continue;
    const type = String(((s.args?.data ?? {}) as { type?: string }).type ?? "");
    if (!/^(click|keydown|keyup|pointerdown|pointerup|mousedown|mouseup|input|touchstart)$/.test(type)) continue;
    events.push({ time: rel(s.start), kind: "task", title: `Input handler "${type}" · ${Math.round(s.dur)} ms`, tone: toneFor(s.dur, 50, 200), window: [rel(s.start), rel(s.start + s.dur)] });
  }

  // Ignore lifecycle events from the initial blank document (before the server replied).
  const afterResponse = (name: string) => trace.markers.find((m) => m.name === name && m.time > origin + (ttfb ?? 0));
  const dcl = afterResponse("domContentLoadedEventEnd");
  const load = afterResponse("loadEventEnd");
  if (dcl) events.push({ time: rel(dcl.time), kind: "load", title: "DOMContentLoaded", tone: "info" });
  if (load) events.push({ time: rel(load.time), kind: "load", title: "Load event", tone: "info" });

  events.sort((a, b) => a.time - b.time);

  // Phases between milestones, with main-thread time by category in each.
  const lcp = trace.lcpCandidates.at(-1);
  const stops: [string, number | undefined][] = [
    ["Waiting for server", ttfb != null ? origin + ttfb : undefined],
    ["Download & parse → first paint", fcp?.time],
    ["First paint → LCP", lcp?.time],
    ["LCP → load", load?.time],
  ];
  const phases: Phase[] = [];
  let cursor = origin;
  for (const [label, end] of stops) {
    if (end == null || end <= cursor) continue;
    const byCategory: Phase["byCategory"] = {};
    for (const s of main) {
      if (s.depth !== 0) continue;
      const lo = Math.max(s.start, cursor);
      const hi = Math.min(s.start + s.dur, end);
      if (hi > lo) {
        const c = categorize(s.name);
        byCategory[c] = (byCategory[c] ?? 0) + (hi - lo);
      }
    }
    phases.push({ label, start: rel(cursor), end: rel(end), byCategory });
    cursor = end;
  }

  const lastEnd = (load ?? lcp)?.time ?? trace.duration;
  return { hotFunctions: hotFunctions(trace.profile, origin, lastEnd, 10), navUrl: trace.navigation?.url, ttfb, fcp: fcp && rel(fcp.time), lcp: lcp && rel(lcp.time), cls, blockingMs, events, phases, scripts };
}
