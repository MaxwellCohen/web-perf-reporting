import { readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, relative, resolve, sep } from "node:path";
import { gunzipSync } from "node:zlib";
import * as traceEngine from "@paulirish/trace_engine";

/**
 * Trace analysis for the CLI and MCP server, backed by Chrome DevTools' trace
 * engine (the same models the Performance panel and Lighthouse use).
 *
 * Adapted from ChromeDevTools/trace-engine-cli (Apache-2.0):
 * https://github.com/ChromeDevTools/trace-engine-cli
 */

export type Rating = "good" | "needs-improvement" | "poor";
export type TreeMode = "list" | "bottom-up" | "top-down";
export type TraceCommand =
  | "overview"
  | "insights"
  | "tasks"
  | "find"
  | "network"
  | "interactions"
  | "shifts"
  | "events"
  | "navigations";

export const TRACE_COMMANDS: TraceCommand[] = [
  "overview",
  "insights",
  "tasks",
  "find",
  "network",
  "interactions",
  "shifts",
  "events",
  "navigations",
];

export interface TimeRange {
  startMs: number;
  endMs: number;
}

export interface RawTraceBounds {
  min: number;
  max: number;
  range?: number;
}

export interface LoadedTrace {
  rawEvents: unknown[];
  // The engine's parsed data is intentionally untyped here: its public types are
  // huge and vary between engine versions.
  // biome-ignore lint/suspicious/noExplicitAny: version-tolerant engine data
  parsedTrace: any;
  file?: string;
}

export interface AnalyzeOptions {
  command?: TraceCommand;
  timeRange?: string;
  absoluteTimestamps?: boolean;
  category?: "lcp" | "inp" | "cls" | "render-blocking" | "third-parties";
  navigationId?: string;
  minDurationMs?: number;
  tree?: TreeMode;
  top?: number;
  functionName?: string;
  renderBlocking?: boolean;
  slowest?: number;
  initiatorChain?: string;
  includeEvents?: boolean;
  names?: string[];
  eventCategory?: string;
  phase?: string;
  fields?: string[];
  limit?: number;
}

// ---------------------------------------------------------------------------
// Loading
// ---------------------------------------------------------------------------

export function isGzipBuffer(buffer: Buffer): boolean {
  return buffer.length >= 2 && buffer[0] === 0x1f && buffer[1] === 0x8b;
}

/** Accepts raw event arrays (`[...]`) and DevTools wrappers (`{"traceEvents":[...]}`). */
export function parseTraceJson(text: string): unknown[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch (err) {
    throw new Error(`Failed to parse trace JSON: ${err instanceof Error ? err.message : String(err)}`);
  }
  if (Array.isArray(parsed)) return parsed;
  if (
    typeof parsed === "object" &&
    parsed !== null &&
    "traceEvents" in parsed &&
    Array.isArray((parsed as { traceEvents: unknown[] }).traceEvents)
  ) {
    return (parsed as { traceEvents: unknown[] }).traceEvents;
  }
  throw new Error(
    'Unrecognized trace format: JSON root must be an array of trace events or an object containing a "traceEvents" array.',
  );
}

// A gzipped trace is usually a few MB; cap the decompressed size so a crafted
// or corrupt archive cannot exhaust memory in the CLI or the MCP server.
const MAX_DECOMPRESSED_BYTES = 256 * 1024 * 1024;

function decompress(buffer: Buffer): string {
  if (!isGzipBuffer(buffer)) return buffer.toString("utf8");
  try {
    return gunzipSync(buffer, { maxOutputLength: MAX_DECOMPRESSED_BYTES }).toString("utf8");
  } catch (err) {
    if (err instanceof Error && /maxOutputLength|buffer/i.test(err.message)) {
      throw new Error(`Gzipped trace exceeds ${MAX_DECOMPRESSED_BYTES / 1024 / 1024} MB when decompressed.`);
    }
    throw new Error(`Failed to decompress gzipped trace: ${err instanceof Error ? err.message : String(err)}`);
  }
}

function isLanternNoise(arg: unknown): boolean {
  if (typeof arg === "string") return arg.includes("LanternError") || arg.includes("NO_LCP");
  if (!arg || typeof arg !== "object") return false;
  const e = arg as { name?: string; message?: string; constructor?: { name?: string } };
  return (
    e.name === "LanternError" ||
    e.constructor?.name === "LanternError" ||
    Boolean(e.message?.includes("NO_LCP"))
  );
}

// The engine logs through the global console, so parses are serialized: two
// concurrent calls would otherwise restore each other's patched console.
let parseLock: Promise<unknown> = Promise.resolve();

async function parseEvents(rawEvents: unknown[]): Promise<LoadedTrace> {
  const run = async (): Promise<LoadedTrace> => {
    const model = traceEngine.TraceModel.Model.createWithAllHandlers();
    const warn = console.warn;
    const error = console.error;
    try {
      console.warn = (...args: unknown[]) => {
        if (!isLanternNoise(args[0])) warn(...args);
      };
      console.error = (...args: unknown[]) => {
        if (!isLanternNoise(args[0])) error(...args);
      };
      await model.parse(rawEvents as never);
    } finally {
      console.warn = warn;
      console.error = error;
    }
    const parsed = model.parsedTrace(0);
    if (!parsed) throw new Error("Failed to retrieve parsed trace data from the trace engine.");
    return { rawEvents, parsedTrace: parsed };
  };
  const result = parseLock.then(run, run);
  parseLock = result.catch(() => undefined);
  return result;
}

export async function loadTraceFile(filePath: string): Promise<LoadedTrace> {
  const absolute = resolve(process.cwd(), filePath);
  let stats;
  try {
    stats = statSync(absolute);
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") {
      throw new Error(`Trace file not found: ${absolute}`);
    }
    throw err;
  }
  if (stats.isDirectory()) {
    throw new Error(
      `'${filePath}' is a directory. Pass a single trace file, or search a directory with: trace scan "${filePath}"`,
    );
  }
  const loaded = await parseEvents(parseTraceJson(decompress(readFileSync(absolute))));
  return { ...loaded, file: absolute };
}

/** Parse a trace that is already in memory (MCP tool input). */
export async function loadTraceBody(body: unknown): Promise<LoadedTrace> {
  if (Array.isArray(body)) return parseEvents(body);
  if (
    typeof body === "object" &&
    body !== null &&
    "traceEvents" in body &&
    Array.isArray((body as { traceEvents: unknown[] }).traceEvents)
  ) {
    return parseEvents((body as { traceEvents: unknown[] }).traceEvents);
  }
  throw new Error('Trace must be an array of events or an object with a "traceEvents" array.');
}

// ---------------------------------------------------------------------------
// Time ranges
// ---------------------------------------------------------------------------

const TIME_RE = /^([+-]?\d+(?:\.\d+)?)\s*(s|ms|us|µs)?$/i;

/** "3.5s", "50ms", "5000us" or bare milliseconds. */
export function parseTimeValue(value: string): number {
  const match = value.trim().match(TIME_RE);
  if (!match) {
    throw new Error(`Invalid time value: "${value}". Use a number with an optional unit (e.g. "3.5s", "50ms").`);
  }
  const n = Number.parseFloat(match[1]);
  const unit = (match[2] ?? "ms").toLowerCase();
  if (unit === "s") return n * 1000;
  if (unit === "us" || unit === "µs") return n / 1000;
  return n;
}

/** "100,500", "3.5s..4.2s", "100ms-500ms" or "100:500". */
export function parseTimeRange(value?: string): TimeRange | undefined {
  const text = value?.trim();
  if (!text) return undefined;
  let parts: string[] = [];
  if (text.includes("..")) parts = text.split("..");
  else if (text.includes(",")) parts = text.split(",");
  else if (text.includes(":")) parts = text.split(":");
  else if (text.includes("-") && !text.startsWith("-")) {
    const idx = text.indexOf("-", 1);
    if (idx !== -1) parts = [text.slice(0, idx), text.slice(idx + 1)];
  }
  if (parts.length !== 2) {
    throw new Error(`Invalid time range: "${value}". Expected "<start>,<end>" (e.g. "3500,4200" or "3.5s,4.2s").`);
  }
  const startMs = parseTimeValue(parts[0]);
  const endMs = parseTimeValue(parts[1]);
  if (startMs > endMs) {
    throw new Error(`Invalid time range: start (${startMs}ms) must be <= end (${endMs}ms).`);
  }
  return { startMs, endMs };
}

export function traceBounds(
  parsedTrace: LoadedTrace["parsedTrace"],
  rawEvents?: unknown[],
): RawTraceBounds {
  const bounds = parsedTrace?.data?.Meta?.traceBounds as RawTraceBounds | undefined;
  if (bounds && Number.isFinite(bounds.min) && Number.isFinite(bounds.max)) return bounds;
  // Some hand-built or trimmed traces have events but no Meta.traceBounds.
  // Metadata events (thread_name/process_name) carry ts: 0 and must not stretch
  // the bounds back to the epoch, so prefer timed, non-metadata events.
  if (rawEvents?.length) {
    let min = Infinity;
    let max = -Infinity;
    let anyMin = Infinity;
    let anyMax = -Infinity;
    for (const raw of rawEvents) {
      if (!raw || typeof raw !== "object") continue;
      const event = raw as { ts?: number; dur?: number; ph?: string };
      if (typeof event.ts !== "number" || !Number.isFinite(event.ts)) continue;
      const end = event.ts + (Number.isFinite(event.dur) ? (event.dur as number) : 0);
      if (event.ts < anyMin) anyMin = event.ts;
      if (end > anyMax) anyMax = end;
      if (event.ph === "M" || event.ts <= 0) continue;
      if (event.ts < min) min = event.ts;
      if (end > max) max = end;
    }
    if (!Number.isFinite(min) || !Number.isFinite(max)) {
      min = anyMin;
      max = anyMax;
    }
    if (Number.isFinite(min) && Number.isFinite(max)) return { min, max };
  }
  throw new Error("Trace is missing Meta.traceBounds and has no timed events.");
}

/** Defaults to times relative to trace start; `absolute` uses raw trace timestamps. */
export function resolveTimeRange(
  range: TimeRange | undefined,
  bounds: RawTraceBounds,
  absolute = false,
): TimeRange | undefined {
  if (!range) return undefined;
  const minMs = bounds.min / 1000;
  const maxMs = bounds.max / 1000;
  const durationMs = maxMs - minMs;
  let startMs: number;
  let endMs: number;
  if (absolute) {
    startMs = range.startMs;
    endMs = range.endMs;
    if (endMs < minMs || startMs > maxMs) {
      throw new Error(
        `Time range [${range.startMs}ms, ${range.endMs}ms] is outside trace bounds [${Math.round(minMs)}ms, ${Math.round(maxMs)}ms].`,
      );
    }
  } else {
    if (range.startMs > durationMs || range.endMs < 0) {
      throw new Error(
        `Time range [${range.startMs}ms, ${range.endMs}ms] is outside trace duration [0ms, ${Math.round(durationMs)}ms].`,
      );
    }
    startMs = minMs + range.startMs;
    endMs = minMs + range.endMs;
  }
  return { startMs: Math.max(minMs, startMs), endMs: Math.min(maxMs, endMs) };
}

const inBounds = (startMs: number, durationMs: number | undefined, range?: TimeRange) => {
  if (!range) return true;
  return startMs + (durationMs ?? 0) >= range.startMs && startMs <= range.endMs;
};

// ---------------------------------------------------------------------------
// Small helpers
// ---------------------------------------------------------------------------

const round = (value: number, decimals = 2) => {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
};
const ms = (microseconds: number) => (Number.isFinite(microseconds) ? round(microseconds / 1000) : 0);
const rate = (value: number, good: number, poor: number): Rating =>
  value <= good ? "good" : value <= poor ? "needs-improvement" : "poor";
/** PageLoadMetrics classifies as "ok" | "needs-improvement" | "poor". */
const classification = (value?: string, fallback?: Rating): Rating =>
  value === "poor" ? "poor" : value === "needs-improvement" ? "needs-improvement" : fallback ?? "good";
const originOf = (url: string): string | undefined => {
  try {
    return new URL(url).origin;
  } catch {
    return undefined;
  }
};

interface RawThreadEntry {
  name: string;
  ts: number;
  dur?: number;
  // biome-ignore lint/suspicious/noExplicitAny: raw trace event payloads
  args?: { data?: Record<string, any> };
}
interface RawThread {
  name: string;
  entries: RawThreadEntry[];
}
interface RawProcess {
  isOnMainFrame?: boolean;
  threads: Map<number, RawThread>;
}
interface RawInsightModel {
  LCPBreakdown?: {
    lcpMs?: number;
    lcpTs?: number;
    subparts?: Record<string, { range?: number } | undefined>;
    lcpRequest?: { args?: { data?: { url?: string } } };
    lcpEvent?: { args?: { data?: { nodeName?: string } } };
  };
  INPBreakdown?: {
    longestInteractionEvent?: RawInteraction;
    highPercentileInteractionEvent?: RawInteraction;
  };
  CLSCulprits?: { clusters?: RawShiftCluster[] };
  RenderBlocking?: {
    renderBlockingRequests?: Array<{
      dur?: number;
      args?: { data?: { url?: string; requestId?: string; encodedDataLength?: number } };
    }>;
  };
  ThirdParties?: {
    entitySummaries?: Array<{ entity?: { name?: string }; transferSize?: number; mainThreadTime?: number }>;
    firstPartyEntity?: { name?: string };
  };
}

function mainRendererThread(parsedTrace: LoadedTrace["parsedTrace"]): RawThread | null {
  const processes = parsedTrace?.data?.Renderer?.processes as Map<number, RawProcess> | undefined;
  if (!processes) return null;
  const pick = (mainFrameOnly: boolean) => {
    for (const proc of processes.values()) {
      if (mainFrameOnly && !proc.isOnMainFrame) continue;
      for (const thread of proc.threads?.values() ?? []) {
        if (thread.name === "CrRendererMain" && thread.entries?.length) return thread;
      }
    }
    return null;
  };
  return pick(true) ?? pick(false);
}

function insightEntry(parsedTrace: LoadedTrace["parsedTrace"], navigationId?: string) {
  const insights = parsedTrace?.insights as
    | Map<string, { id?: string; model?: RawInsightModel; navigation?: { args?: { data?: { navigationId?: string } } } }>
    | undefined;
  if (!insights?.size) return null;
  if (navigationId) {
    for (const [key, value] of insights) {
      if (
        key === navigationId ||
        value.id === navigationId ||
        value.navigation?.args?.data?.navigationId === navigationId
      ) {
        return { id: key || navigationId, model: (value.model ?? value) as RawInsightModel };
      }
    }
    return null;
  }
  for (const [key, value] of insights) {
    return { id: key, model: (value.model ?? value) as RawInsightModel };
  }
  return null;
}

function frameOf(entry: RawThreadEntry): { functionName?: string; url?: string; lineNumber?: number; columnNumber?: number } {
  try {
    // biome-ignore lint/suspicious/noExplicitAny: engine helper accepts raw events
    const frame = traceEngine.Extras.TraceTree.eventStackFrame(entry as any);
    return frame ?? {};
  } catch {
    return {};
  }
}

function getProperty(obj: unknown, path: string): unknown {
  let current: unknown = obj;
  for (const part of path.split(".")) {
    if (current === null || current === undefined || typeof current !== "object") return undefined;
    current = (current as Record<string, unknown>)[part];
  }
  return current;
}

// ---------------------------------------------------------------------------
// Reports
// ---------------------------------------------------------------------------

export interface OverviewReport {
  command: "overview";
  file?: string;
  url: string | null;
  bounds: { minMs: number; maxMs: number; durationMs: number };
  navigationStartMs: number | null;
  coreWebVitals: {
    fcp: { valueMs: number; rating: Rating } | null;
    lcp: { valueMs: number; rating: Rating; element?: string; url?: string } | null;
    cls: { value: number; rating: Rating; worstCluster?: number } | null;
    inp: { valueMs: number; rating: Rating; interactionType?: string } | null;
  };
  mainThreadBreakdown: {
    scriptingMs: number;
    layoutMs: number;
    renderingMs: number;
    gcMs: number;
    systemMs: number;
    idleMs: number;
    totalMs: number;
  };
  warnings: string[];
}

export interface InsightsReport {
  command: "insights";
  navigationId?: string;
  lcpBreakdown?: {
    totalLcpMs: number;
    ttfbMs: number;
    loadDelayMs: number;
    loadDurationMs: number;
    renderDelayMs: number;
    element?: string;
    url?: string;
  };
  inpBreakdown?: {
    eventType: string;
    totalDurationMs: number;
    inputDelayMs: number;
    processingDurationMs: number;
    presentationDelayMs: number;
    target?: string;
  };
  clsCulprits?: Array<{ timestampMs: number; score: number; culpritNodes: string[] }>;
  renderBlocking?: Array<{ url: string; durationMs: number; transferSizeBytes: number }>;
  thirdParties?: Array<{ entityName: string; mainThreadTimeMs: number; transferSizeBytes: number }>;
  warnings?: string[];
}

export interface TasksReport {
  command: "tasks";
  mode: TreeMode;
  tasks: Array<{
    startTimeMs: number;
    durationMs: number;
    selfTimeMs: number;
    functionName: string;
    url?: string;
    lineNumber?: number;
  }>;
}

export interface FindReport {
  command: "find";
  functionQuery: string;
  timeRange?: TimeRange;
  totalCalls: number;
  totalDurationMs: number;
  avgDurationMs: number;
  firstCallMs?: number;
  lastCallMs?: number;
  calls: Array<{ timestampMs: number; durationMs: number; url?: string; lineNumber?: number }>;
}

export interface NetworkReport {
  command: "network";
  initiatorChain?: Array<{ url: string; initiatorUrl?: string; type?: string }>;
  requests: Array<{
    url: string;
    mimeType: string;
    priority: string;
    queueingMs: number;
    ttfbMs: number;
    downloadMs: number;
    totalDurationMs: number;
    transferSizeBytes: number;
    renderBlocking: boolean;
  }>;
}

export interface InteractionsReport {
  command: "interactions";
  interactions: Array<{
    eventType: string;
    startTimeMs: number;
    durationMs: number;
    inputDelayMs: number;
    processingDurationMs: number;
    presentationDelayMs: number;
    targetElement?: string;
    interactionId?: number;
  }>;
}

export interface ShiftsReport {
  command: "shifts";
  clusters: Array<{
    timestampMs: number;
    durationMs: number;
    cumulativeScore: number;
    culprits: Array<{ nodeId?: number; tagName?: string; selector?: string; debugName?: string; scoreDelta?: number }>;
    events?: Array<{ timestampMs: number; score: number; hadRecentInput?: boolean }>;
  }>;
}

export interface EventsReport {
  command: "events";
  totalMatched: number;
  returned: number;
  events: Array<{
    name: string;
    tsMs: number;
    durMs?: number;
    cat?: string;
    ph?: string;
    pid?: number;
    tid?: number;
    selectedFields?: Record<string, unknown>;
  }>;
}

export interface NavigationsReport {
  command: "navigations";
  total: number;
  insightSetIds: string[];
  navigations: Array<{
    navigationId: string;
    insightSetId?: string;
    frameId?: string;
    url: string;
    timestampMs: number;
    isMainFrame: boolean;
    hasInsights: boolean;
  }>;
}

export interface ScanReport {
  command: "scan";
  query: { names?: string[]; category?: string; phase?: string; grep?: string; fields?: string[] };
  totalFilesScanned: number;
  totalFilesMatched: number;
  totalFilesSkipped: number;
  totalEventsMatched: number;
  skippedFiles: Array<{ file: string; reason: string }>;
  matchedFiles: Array<{
    file: string;
    matchCount: number;
    categories: string[];
    firstEventName?: string;
    firstEventTsMs?: number;
  }>;
}

export type TraceReport =
  | OverviewReport
  | InsightsReport
  | TasksReport
  | FindReport
  | NetworkReport
  | InteractionsReport
  | ShiftsReport
  | EventsReport
  | NavigationsReport
  | ScanReport;

// ---------------------------------------------------------------------------
// Extractors
// ---------------------------------------------------------------------------

function buildOverview(loaded: LoadedTrace, range?: TimeRange): OverviewReport {
  const data = loaded.parsedTrace.data;
  const bounds = traceBounds(loaded.parsedTrace, loaded.rawEvents);
  const minMs = range ? range.startMs : ms(bounds.min);
  const maxMs = range ? range.endMs : ms(bounds.max);

  const mainNavs = (data.Meta.mainFrameNavigations ?? []) as Array<{ ts: number }>;
  const allNavs = [...(data.Meta.navigationsByNavigationId?.values() ?? [])] as Array<{ ts: number }>;
  const firstNav = mainNavs[0] ?? allNavs[0];

  const frameMetrics = data.PageLoadMetrics?.metricScoresByFrameId?.get(data.Meta.mainFrameId);
  const navMetrics = frameMetrics ? [...frameMetrics.values()][0] : undefined;

  let fcp: OverviewReport["coreWebVitals"]["fcp"] = null;
  let lcp: OverviewReport["coreWebVitals"]["lcp"] = null;
  const fcpMetric = navMetrics?.get("FCP");
  if (fcpMetric?.timing !== undefined) {
    const valueMs = round(ms(fcpMetric.timing));
    fcp = { valueMs, rating: classification(fcpMetric.classification, rate(valueMs, 1800, 3000)) };
  }
  const lcpMetric = navMetrics?.get("LCP");
  if (lcpMetric?.timing !== undefined) {
    const valueMs = round(ms(lcpMetric.timing));
    lcp = { valueMs, rating: classification(lcpMetric.classification, rate(valueMs, 2500, 4000)) };
  }

  const insight = insightEntry(loaded.parsedTrace);
  if (insight?.model.LCPBreakdown) {
    const l = insight.model.LCPBreakdown;
    if (l.lcpMs !== undefined && !lcp) {
      lcp = { valueMs: round(l.lcpMs), rating: rate(l.lcpMs, 2500, 4000) };
    }
    if (lcp) {
      if (l.lcpRequest?.args?.data?.url) lcp.url = l.lcpRequest.args.data.url;
      if (l.lcpEvent?.args?.data?.nodeName) lcp.element = l.lcpEvent.args.data.nodeName;
    }
  }

  const layoutShifts = data.LayoutShifts;
  let cls: OverviewReport["coreWebVitals"]["cls"] = null;
  if (layoutShifts) {
    const score = layoutShifts.sessionMaxScore ?? 0;
    const worst = layoutShifts.clusters?.reduce(
      (max: number, cluster: RawShiftCluster) => Math.max(max, cluster.clusterCumulativeScore ?? 0),
      0,
    );
    cls = {
      value: round(score, 4),
      rating: rate(score, 0.1, 0.25),
      worstCluster: worst !== undefined ? round(worst, 4) : undefined,
    };
  }

  const inpEvent: RawInteraction | undefined =
    insight?.model.INPBreakdown?.highPercentileInteractionEvent ??
    data.UserInteractions?.longestInteractionEvent;
  let inp: OverviewReport["coreWebVitals"]["inp"] = null;
  if (inpEvent) {
    const valueMs = round(ms(inpEvent.dur ?? 0));
    inp = { valueMs, rating: rate(valueMs, 200, 500), interactionType: inpEvent.type };
  }

  const breakdown = {
    scriptingMs: 0,
    layoutMs: 0,
    renderingMs: 0,
    gcMs: 0,
    systemMs: 0,
    idleMs: 0,
    totalMs: round(maxMs - minMs),
  };
  const thread = mainRendererThread(loaded.parsedTrace);
  if (thread?.entries.length) {
    const Root = traceEngine.Extras.TraceTree.BottomUpRootNode as unknown as new (
      entries: unknown,
      options: unknown,
    ) => { children: () => Map<unknown, { selfTime: number; event?: { name?: string }; id?: unknown }> };
    const root = new Root(thread.entries, {
      textFilter: { accept: () => true },
      filters: [],
      startTime: minMs,
      endTime: maxMs,
    });
    for (const node of root.children().values()) {
      if (node.selfTime <= 0) continue;
      const name = node.event?.name ?? String(node.id ?? "");
      if (name === "MajorGC" || name === "MinorGC" || name === "GCEvent" || name.startsWith("v8.gc")) {
        breakdown.gcMs += node.selfTime;
      } else if (name === "Layout" || name === "UpdateLayoutTree" || name === "InvalidateLayout") {
        breakdown.layoutMs += node.selfTime;
      } else if (
        name === "UpdateLayerTree" ||
        name === "Paint" ||
        name === "CompositeLayers" ||
        name === "RasterTask" ||
        name === "DecodeImage"
      ) {
        breakdown.renderingMs += node.selfTime;
      } else if (
        name.startsWith("f:") ||
        name === "EvaluateScript" ||
        name === "FunctionCall" ||
        name === "v8.compile" ||
        name === "v8.run" ||
        name === "TimerFire" ||
        name === "FireAnimationFrame" ||
        name === "EventDispatch"
      ) {
        breakdown.scriptingMs += node.selfTime;
      } else {
        breakdown.systemMs += node.selfTime;
      }
    }
  }
  for (const key of ["scriptingMs", "layoutMs", "renderingMs", "gcMs", "systemMs"] as const) {
    breakdown[key] = round(breakdown[key]);
  }
  const active =
    breakdown.scriptingMs + breakdown.layoutMs + breakdown.renderingMs + breakdown.gcMs + breakdown.systemMs;
  breakdown.idleMs = round(Math.max(0, breakdown.totalMs - active));

  const warnings: string[] = [];
  if (fcp?.rating === "poor") warnings.push(`Poor First Contentful Paint: ${fcp.valueMs}ms (poor above 3000ms)`);
  if (lcp?.rating === "poor") warnings.push(`Poor Largest Contentful Paint: ${lcp.valueMs}ms (poor above 4000ms)`);
  if (cls?.rating === "poor") warnings.push(`Poor Cumulative Layout Shift: ${cls.value} (poor above 0.25)`);
  if (inp?.rating === "poor") warnings.push(`Poor Interaction to Next Paint: ${inp.valueMs}ms (poor above 500ms)`);
  const blocking = insight?.model.RenderBlocking?.renderBlockingRequests?.length ?? 0;
  if (blocking > 0) warnings.push(`${blocking} render-blocking resource(s) detected.`);

  const traceStartMs = ms(bounds.min);
  return {
    command: "overview",
    file: loaded.file,
    url: data.Meta.mainFrameURL ?? null,
    bounds: {
      minMs: round(minMs - traceStartMs),
      maxMs: round(maxMs - traceStartMs),
      durationMs: round(maxMs - minMs),
    },
    navigationStartMs: firstNav ? round(ms(firstNav.ts) - traceStartMs) : null,
    coreWebVitals: { fcp, lcp, cls, inp },
    mainThreadBreakdown: breakdown,
    warnings,
  };
}

function buildInsights(loaded: LoadedTrace, options: AnalyzeOptions): InsightsReport {
  const entry = insightEntry(loaded.parsedTrace, options.navigationId);
  if (options.navigationId && !entry) {
    const insights = loaded.parsedTrace?.insights as Map<string, unknown> | undefined;
    const available = insights ? [...insights.keys()] : [];
    throw new Error(
      `Unknown navigation or insight set "${options.navigationId}". Available: ${available.length ? available.join(", ") : "none"}.`,
    );
  }
  const model = entry?.model;
  const traceStart = traceBounds(loaded.parsedTrace, loaded.rawEvents).min;
  const result: InsightsReport = { command: "insights", navigationId: options.navigationId };
  const warnings: string[] = [];
  const include = (category: string) => !options.category || options.category === category;
  const allowFallback = !options.navigationId;

  if (include("lcp") && model?.LCPBreakdown) {
    const l = model.LCPBreakdown;
    const range = (key: string) => round(ms(l.subparts?.[key]?.range ?? 0));
    const ttfbMs = range("ttfb");
    const loadDelayMs = range("loadDelay");
    const loadDurationMs = range("loadDuration");
    const renderDelayMs = range("renderDelay");
    result.lcpBreakdown = {
      // `lcpTs` is a trace timestamp, not a duration: never fall back to it.
      // Without `lcpMs`, the subparts are the only navigation-relative total.
      totalLcpMs: round(l.lcpMs ?? ttfbMs + loadDelayMs + loadDurationMs + renderDelayMs),
      ttfbMs,
      loadDelayMs,
      loadDurationMs,
      renderDelayMs,
      element: l.lcpEvent?.args?.data?.nodeName,
      url: l.lcpRequest?.args?.data?.url,
    };
    if (result.lcpBreakdown.renderDelayMs > 1000) {
      warnings.push(`High LCP element render delay: ${result.lcpBreakdown.renderDelayMs}ms.`);
    }
    if (result.lcpBreakdown.loadDelayMs > 1000) {
      warnings.push(`High LCP resource load delay: ${result.lcpBreakdown.loadDelayMs}ms.`);
    }
  }

  if (include("inp")) {
    // INP is the high-percentile interaction (98th), not simply the longest one.
    const inpEvent: RawInteraction | undefined =
      model?.INPBreakdown?.highPercentileInteractionEvent ??
      model?.INPBreakdown?.longestInteractionEvent ??
      (allowFallback ? loaded.parsedTrace.data.UserInteractions?.longestInteractionEvent : undefined);
    if (inpEvent) {
      result.inpBreakdown = {
        eventType: inpEvent.type ?? inpEvent.name ?? "unknown",
        totalDurationMs: round(ms(inpEvent.dur ?? 0)),
        inputDelayMs: round(ms(inpEvent.inputDelay ?? 0)),
        processingDurationMs: round(ms(inpEvent.mainThreadHandling ?? inpEvent.processingDuration ?? 0)),
        presentationDelayMs: round(ms(inpEvent.presentationDelay ?? 0)),
        target: inpEvent.args?.data?.nodeName,
      };
      if (result.inpBreakdown.totalDurationMs > 200) {
        warnings.push(
          `Interaction driving INP (${result.inpBreakdown.eventType}) exceeded 200ms: ${result.inpBreakdown.totalDurationMs}ms.`,
        );
      }
    }
  }

  if (include("cls")) {
    const clusters: RawShiftCluster[] =
      model?.CLSCulprits?.clusters ??
      (allowFallback ? loaded.parsedTrace.data.LayoutShifts?.clusters : undefined) ??
      [];
    if (clusters.length) {
      result.clsCulprits = clusters.map((cluster) => {
        const nodes = new Set<string>();
        for (const event of cluster.events ?? []) {
          for (const node of event.args?.data?.impacted_nodes ?? []) {
            const label = node.selector ?? node.debug_name ?? node.tag_name ?? (node.node_id ? `Node #${node.node_id}` : "");
            if (label) nodes.add(label);
          }
        }
        return {
          timestampMs: round(ms((cluster.clusterWindow?.min ?? cluster.ts ?? 0) - traceStart)),
          score: round(cluster.clusterCumulativeScore ?? 0, 4),
          culpritNodes: [...nodes],
        };
      });
    }
  }

  if (include("render-blocking")) {
    const requests = model?.RenderBlocking?.renderBlockingRequests ?? [];
    if (requests.length) {
      result.renderBlocking = requests.map((req) => ({
        url: req.args?.data?.url ?? "",
        durationMs: round(ms(req.dur ?? 0)),
        // Chrome uses -1 for unknown sizes; JSON/TOON must match the markdown clamp.
        transferSizeBytes: Math.max(0, req.args?.data?.encodedDataLength ?? 0),
      }));
      warnings.push(`${requests.length} render-blocking request(s) found.`);
    }
  }

  if (include("third-parties")) {
    const firstParty = model?.ThirdParties?.firstPartyEntity?.name;
    const summaries = (model?.ThirdParties?.entitySummaries ?? []).filter(
      (summary) => summary.entity?.name !== firstParty,
    );
    if (summaries.length) {
      result.thirdParties = summaries.map((s) => ({
        entityName: s.entity?.name ?? "Unknown",
        mainThreadTimeMs: round(s.mainThreadTime ?? 0),
        transferSizeBytes: Math.max(0, s.transferSize ?? 0),
      }));
    }
  }

  if (warnings.length) result.warnings = warnings;
  return result;
}

function buildTasks(loaded: LoadedTrace, options: AnalyzeOptions, range?: TimeRange): TasksReport {
  const thread = mainRendererThread(loaded.parsedTrace);
  const top = options.top ?? 30;
  const mode = options.tree ?? "list";
  const tasks: TasksReport["tasks"] = [];
  if (!thread?.entries.length) return { command: "tasks", mode, tasks };

  if (mode === "bottom-up" || mode === "top-down") {
    const Root = (mode === "bottom-up"
      ? traceEngine.Extras.TraceTree.BottomUpRootNode
      : traceEngine.Extras.TraceTree.TopDownRootNode) as unknown as new (
      entries: unknown,
      options: unknown,
    ) => { children: () => Map<unknown, RawTreeNode> };
    const bounds = traceBounds(loaded.parsedTrace, loaded.rawEvents);
    const root = new Root(thread.entries, {
      textFilter: { accept: () => true },
      filters: [],
      startTime: range?.startMs ?? ms(bounds.min),
      endTime: range?.endMs ?? ms(bounds.max),
    });
    for (const node of root.children().values()) {
      if (node.selfTime <= 0) continue;
      const frame = node.event ? frameOf(node.event) : {};
      tasks.push({
        // Nodes aggregate many call sites; use the node's own event time when
        // available instead of reporting the whole window's start.
        startTimeMs: node.event?.ts !== undefined ? round(ms(node.event.ts - bounds.min)) : 0,
        durationMs: round(node.totalTime),
        selfTimeMs: round(node.selfTime),
        functionName: frame.functionName ?? node.event?.name ?? "Unknown",
        url: frame.url,
        lineNumber: frame.lineNumber,
      });
    }
    tasks.sort((a, b) => (mode === "bottom-up" ? b.selfTimeMs - a.selfTimeMs : b.durationMs - a.durationMs));
    return { command: "tasks", mode, tasks: tasks.slice(0, top) };
  }

  const entryToNode = loaded.parsedTrace.data.Renderer?.entryToNode as
    | Map<unknown, { children?: RawTreeNode[] }>
    | undefined;
  const traceStart = traceBounds(loaded.parsedTrace, loaded.rawEvents).min;
  const minDuration = options.minDurationMs ?? 50;
  for (const entry of thread.entries) {
    if (!entry.dur) continue;
    const durationMs = ms(entry.dur);
    const startMs = ms(entry.ts);
    if (durationMs < minDuration || !inBounds(startMs, durationMs, range)) continue;
    const isTop =
      entry.name === "RunTask" ||
      // biome-ignore lint/suspicious/noExplicitAny: engine helper accepts raw events
      traceEngine.Helpers.Trace.isTopLevelEvent(entry as any);
    if (!isTop) continue;

    const frame = frameOf(entry);
    let functionName = frame.functionName ?? entry.name;
    let selfTimeMs = durationMs;
    const node = entryToNode?.get(entry);
    if (node?.children?.length) {
      const childSum = node.children.reduce((sum, child) => sum + ms(child.entry.dur ?? 0), 0);
      selfTimeMs = Math.max(0, durationMs - childSum);
      if (!frame.functionName) {
        const child = node.children[0].entry;
        functionName = `${entry.name} > ${frameOf(child).functionName ?? child.name}`;
      }
    }
    tasks.push({
      startTimeMs: round(ms(entry.ts - traceStart)),
      durationMs: round(durationMs),
      selfTimeMs: round(selfTimeMs),
      functionName,
      url: frame.url,
      lineNumber: frame.lineNumber,
    });
  }
  tasks.sort((a, b) => b.durationMs - a.durationMs);
  return { command: "tasks", mode, tasks: tasks.slice(0, top) };
}

interface RawTreeNode {
  entry: RawThreadEntry;
  children?: RawTreeNode[];
  selfTime: number;
  totalTime: number;
  event?: RawThreadEntry;
}

function buildFind(loaded: LoadedTrace, options: AnalyzeOptions, range?: TimeRange): FindReport {
  const query = (options.functionName ?? "").trim();
  const limit = options.limit ?? 50;
  const traceStart = traceBounds(loaded.parsedTrace, loaded.rawEvents).min;
  const traceStartMs = ms(traceStart);
  const report: FindReport = {
    command: "find",
    functionQuery: query,
    timeRange: range
      ? { startMs: round(range.startMs - traceStartMs), endMs: round(range.endMs - traceStartMs) }
      : undefined,
    totalCalls: 0,
    totalDurationMs: 0,
    avgDurationMs: 0,
    calls: [],
  };
  const thread = mainRendererThread(loaded.parsedTrace);
  if (!thread || !query) return report;

  const lower = query.toLowerCase();
  const calls: FindReport["calls"] = [];
  for (const entry of thread.entries) {
    const startMs = ms(entry.ts);
    const durationMs = ms(entry.dur ?? 0);
    // Zero-duration samples are bookkeeping events, not calls worth reporting.
    if (durationMs <= 0 || !inBounds(startMs, durationMs, range)) continue;
    const frame = frameOf(entry);
    const name = (frame.functionName ?? entry.name ?? "").toLowerCase();
    if (!name.includes(lower)) continue;
    calls.push({
      timestampMs: round(ms(entry.ts - traceStart)),
      durationMs: round(durationMs),
      url: frame.url,
      lineNumber: frame.lineNumber,
    });
  }
  report.totalCalls = calls.length;
  if (!calls.length) return report;
  const total = calls.reduce((sum, call) => sum + call.durationMs, 0);
  report.totalDurationMs = round(total);
  report.avgDurationMs = round(total / calls.length);
  report.firstCallMs = calls[0].timestampMs;
  report.lastCallMs = calls[calls.length - 1].timestampMs;
  report.calls = calls.slice(0, limit);
  return report;
}

function buildNetwork(loaded: LoadedTrace, options: AnalyzeOptions, range?: TimeRange): NetworkReport {
  const data = loaded.parsedTrace.data;
  const requests = (data.NetworkRequests?.byTime ?? []) as Array<{
    ts: number;
    dur?: number;
    name?: string;
    args?: {
      data?: {
        requestId?: string;
        url?: string;
        mimeType?: string;
        priority?: string;
        renderBlocking?: string;
        encodedDataLength?: number;
        syntheticData?: { queueing?: number; waiting?: number; download?: number };
      };
    };
  }>;
  const report: NetworkReport = { command: "network", requests: [] };

  if (options.initiatorChain) {
    const target = requests.find(
      (r) =>
        r.args?.data?.requestId === options.initiatorChain ||
        Boolean(r.args?.data?.url?.includes(options.initiatorChain as string)),
    );
    if (target) {
      const chain: NonNullable<NetworkReport["initiatorChain"]> = [];
      const seen = new Set<unknown>();
      let current: typeof target | undefined = target;
      while (current && !seen.has(current)) {
        seen.add(current);
        const initiator = traceEngine.Extras.Initiators.getNetworkInitiator(
          data,
          // biome-ignore lint/suspicious/noExplicitAny: engine helper accepts raw events
          current as any,
        ) as typeof target | undefined;
        chain.push({
          url: current.args?.data?.url ?? current.name ?? "Unknown",
          initiatorUrl: initiator?.args?.data?.url ?? initiator?.name,
          type: current.args?.data?.mimeType ?? current.name,
        });
        current = initiator;
      }
      report.initiatorChain = chain;
    }
  }

  // Key by request ID when available: the same URL can appear in several
  // navigations, so a URL set alone would mark the wrong request blocking.
  const blockingIds = new Set<string>();
  const blockingUrls = new Set<string>();
  for (const entry of loaded.parsedTrace.insights?.values() ?? []) {
    const model = (entry.model ?? entry) as RawInsightModel;
    for (const req of model.RenderBlocking?.renderBlockingRequests ?? []) {
      const id = req.args?.data?.requestId;
      if (id) blockingIds.add(id);
      const url = req.args?.data?.url;
      if (url) blockingUrls.add(url);
    }
  }

  const slowest = options.slowest ?? 20;
  const processed: NetworkReport["requests"] = [];
  for (const request of requests) {
    const startMs = ms(request.ts);
    const durationMs = ms(request.dur ?? 0);
    if (!inBounds(startMs, durationMs, range)) continue;
    const url = request.args?.data?.url ?? "";
    const requestId = request.args?.data?.requestId;
    const blocking =
      request.args?.data?.renderBlocking === "blocking" ||
      request.args?.data?.renderBlocking === "in_body_parser_blocking" ||
      (requestId ? blockingIds.has(requestId) : blockingUrls.has(url));
    if (options.renderBlocking && !blocking) continue;
    const synthetic = request.args?.data?.syntheticData;
    processed.push({
      url,
      mimeType: request.args?.data?.mimeType ?? "",
      priority: request.args?.data?.priority ?? "Normal",
      queueingMs: round(ms(synthetic?.queueing ?? 0)),
      ttfbMs: round(ms(synthetic?.waiting ?? 0)),
      downloadMs: round(ms(synthetic?.download ?? 0)),
      totalDurationMs: round(durationMs),
      transferSizeBytes: Math.max(0, request.args?.data?.encodedDataLength ?? 0),
      renderBlocking: blocking,
    });
  }
  processed.sort((a, b) => b.totalDurationMs - a.totalDurationMs);
  report.requests = processed.slice(0, slowest);
  return report;
}

interface RawInteraction {
  ts?: number;
  dur?: number;
  type?: string;
  name?: string;
  interactionId?: number;
  inputDelay?: number;
  mainThreadHandling?: number;
  processingDuration?: number;
  presentationDelay?: number;
  args?: {
    data?: {
      nodeName?: string;
      beginEvent?: { args?: { data?: { nodeName?: string } } };
    };
  };
}

function buildInteractions(loaded: LoadedTrace, range?: TimeRange): InteractionsReport {
  const data = loaded.parsedTrace.data.UserInteractions;
  const raw = (data?.interactionEventsWithNoNesting ?? data?.interactionEvents ?? []) as RawInteraction[];
  const traceStart = traceBounds(loaded.parsedTrace, loaded.rawEvents).min;
  const interactions: InteractionsReport["interactions"] = [];
  for (const event of raw) {
    // A synthetic event without a timestamp has no place on the timeline.
    if (typeof event.ts !== "number" || !Number.isFinite(event.ts)) continue;
    const startMs = ms(event.ts);
    const durationMs = ms(event.dur ?? 0);
    if (!inBounds(startMs, durationMs, range)) continue;
    interactions.push({
      eventType: event.type ?? event.name ?? "interaction",
      startTimeMs: round(ms(event.ts - traceStart)),
      durationMs: round(durationMs),
      inputDelayMs: round(ms(event.inputDelay ?? 0)),
      processingDurationMs: round(ms(event.mainThreadHandling ?? event.processingDuration ?? 0)),
      presentationDelayMs: round(ms(event.presentationDelay ?? 0)),
      targetElement: event.args?.data?.nodeName ?? event.args?.data?.beginEvent?.args?.data?.nodeName,
      interactionId: event.interactionId,
    });
  }
  interactions.sort((a, b) => b.durationMs - a.durationMs);
  return { command: "interactions", interactions };
}

interface RawShiftCluster {
  clusterCumulativeScore?: number;
  ts?: number;
  dur?: number;
  clusterWindow?: { min?: number; range?: number };
  events?: Array<{
    ts?: number;
    args?: {
      data?: {
        score?: number;
        weighted_score_delta?: number;
        had_recent_input?: boolean;
        impacted_nodes?: Array<{
          node_id?: number;
          tag_name?: string;
          selector?: string;
          debug_name?: string;
        }>;
      };
    };
  }>;
}

function buildShifts(loaded: LoadedTrace, options: AnalyzeOptions, range?: TimeRange): ShiftsReport {
  const raw = (loaded.parsedTrace.data.LayoutShifts?.clusters ?? []) as RawShiftCluster[];
  const traceStart = traceBounds(loaded.parsedTrace, loaded.rawEvents).min;
  const clusters: ShiftsReport["clusters"] = [];
  for (const cluster of raw) {
    const clusterStart = cluster.clusterWindow?.min ?? cluster.ts;
    if (typeof clusterStart !== "number" || !Number.isFinite(clusterStart)) continue;
    const startMs = ms(clusterStart);
    const durationMs = ms(cluster.clusterWindow?.range ?? cluster.dur ?? 0);
    if (!inBounds(startMs, durationMs, range)) continue;
    const culprits = new Map<string, NonNullable<ShiftsReport["clusters"][number]["culprits"]>[number]>();
    const events: NonNullable<ShiftsReport["clusters"][number]["events"]> = [];
    for (const event of cluster.events ?? []) {
      const delta = event.args?.data?.weighted_score_delta;
      for (const node of event.args?.data?.impacted_nodes ?? []) {
        const key = node.selector ?? (node.node_id ? `node:${node.node_id}` : node.debug_name ?? node.tag_name ?? "unknown");
        const existing = culprits.get(key);
        if (existing) {
          if (delta !== undefined) existing.scoreDelta = round((existing.scoreDelta ?? 0) + delta, 4);
        } else {
          culprits.set(key, {
            nodeId: node.node_id,
            tagName: node.tag_name,
            selector: node.selector ?? (node.node_id ? `Node #${node.node_id}` : undefined),
            debugName: node.debug_name,
            scoreDelta: delta !== undefined ? round(delta, 4) : undefined,
          });
        }
      }
      if (options.includeEvents) {
        if (typeof event.ts !== "number" || !Number.isFinite(event.ts)) continue;
        events.push({
          timestampMs: round(ms(event.ts - traceStart)),
          score: round(event.args?.data?.score ?? event.args?.data?.weighted_score_delta ?? 0, 4),
          hadRecentInput: event.args?.data?.had_recent_input,
        });
      }
    }
    clusters.push({
      timestampMs: round(ms(clusterStart - traceStart)),
      durationMs: round(durationMs),
      cumulativeScore: round(cluster.clusterCumulativeScore ?? 0, 4),
      culprits: [...culprits.values()],
      ...(options.includeEvents ? { events } : {}),
    });
  }
  clusters.sort((a, b) => b.cumulativeScore - a.cumulativeScore);
  return { command: "shifts", clusters };
}

function buildEvents(loaded: LoadedTrace, options: AnalyzeOptions, range?: TimeRange): EventsReport {
  const names = options.names?.length ? new Set(options.names) : null;
  const limit = options.limit ?? 50;
  const traceStart = traceBounds(loaded.parsedTrace, loaded.rawEvents).min;
  const events: EventsReport["events"] = [];
  let totalMatched = 0;
  for (const raw of loaded.rawEvents) {
    if (!raw || typeof raw !== "object") continue;
    const event = raw as { name?: string; cat?: string; ph?: string; ts?: number; dur?: number; pid?: number; tid?: number };
    if (typeof event.ts !== "number" || !Number.isFinite(event.ts)) continue;
    if (names && !names.has(event.name ?? "")) continue;
    if (
      options.eventCategory &&
      !(event.cat === options.eventCategory || event.cat?.split(",").includes(options.eventCategory))
    ) {
      continue;
    }
    if (options.phase && event.ph !== options.phase) continue;
    const tsMs = ms(event.ts);
    const durMs = ms(event.dur ?? 0);
    if (!inBounds(tsMs, durMs, range)) continue;
    totalMatched++;
    if (events.length >= limit) continue;
    const item: EventsReport["events"][number] = {
      name: event.name ?? "",
      tsMs: round(ms(event.ts - traceStart)),
      durMs: event.dur !== undefined ? round(durMs) : undefined,
      cat: event.cat,
      ph: event.ph,
      pid: event.pid,
      tid: event.tid,
    };
    if (options.fields?.length) {
      item.selectedFields = Object.fromEntries(options.fields.map((field) => [field, getProperty(raw, field)]));
    }
    events.push(item);
  }
  return { command: "events", totalMatched, returned: events.length, events };
}

function buildNavigations(loaded: LoadedTrace): NavigationsReport {
  const meta = loaded.parsedTrace.data.Meta;
  const map = meta?.navigationsByNavigationId as Map<string, { ts?: number; args?: { frame?: string; data?: Record<string, unknown> } }> | undefined;
  const finalUrls = meta?.finalDisplayUrlByNavigationId as Map<string, string> | undefined;
  const insights = loaded.parsedTrace.insights as Map<string, { id?: string; navigation?: { args?: { data?: { navigationId?: string } } } }> | undefined;
  const insightIds = insights ? [...insights.keys()] : [];
  const traceStart = traceBounds(loaded.parsedTrace, loaded.rawEvents).min;
  const navigations: NavigationsReport["navigations"] = [];
  for (const [id, nav] of map ?? []) {
    const data = nav.args?.data ?? {};
    const frameId = nav.args?.frame ?? (data.frame as string | undefined);
    const match = insights
      ? [...insights.entries()].find(
          ([key, value]) => key === id || value.id === id || value.navigation?.args?.data?.navigationId === id,
        )
      : undefined;
    navigations.push({
      navigationId: id,
      insightSetId: match?.[0],
      frameId,
      url: finalUrls?.get(id) ?? (data.documentLoaderURL as string | undefined) ?? (data.url as string | undefined) ?? "",
      timestampMs: round(ms((nav.ts ?? 0) - traceStart)),
      isMainFrame: Boolean(data.isOutermostMainFrame ?? data.isInPrimaryMainFrame ?? data.isMainFrame ?? (frameId && frameId === meta.mainFrameId)),
      hasInsights: Boolean(match),
    });
  }
  navigations.sort((a, b) => a.timestampMs - b.timestampMs);
  return { command: "navigations", total: navigations.length, insightSetIds: insightIds, navigations };
}

// ---------------------------------------------------------------------------
// Public analysis entry points
// ---------------------------------------------------------------------------

export function buildReport(loaded: LoadedTrace, options: AnalyzeOptions = {}): TraceReport {
  const command = options.command ?? "overview";
  // Insights and navigations are per-navigation models, not event windows.
  if (options.timeRange && (command === "insights" || command === "navigations")) {
    throw new Error(`The ${command} command does not support a time range.`);
  }
  const range = resolveTimeRange(
    parseTimeRange(options.timeRange),
    traceBounds(loaded.parsedTrace, loaded.rawEvents),
    options.absoluteTimestamps,
  );
  switch (command) {
    case "insights":
      return buildInsights(loaded, options);
    case "tasks":
      return buildTasks(loaded, options, range);
    case "find":
      return buildFind(loaded, options, range);
    case "network":
      return buildNetwork(loaded, options, range);
    case "interactions":
      return buildInteractions(loaded, range);
    case "shifts":
      return buildShifts(loaded, options, range);
    case "events":
      return buildEvents(loaded, options, range);
    case "navigations":
      return buildNavigations(loaded);
    default:
      return buildOverview(loaded, range);
  }
}

export async function analyzeTraceFile(file: string, options: AnalyzeOptions = {}): Promise<TraceReport> {
  return buildReport(await loadTraceFile(file), options);
}

export async function analyzeTraceBody(body: unknown, options: AnalyzeOptions = {}): Promise<TraceReport> {
  return buildReport(await loadTraceBody(body), options);
}

// ---------------------------------------------------------------------------
// Multi-file scan
// ---------------------------------------------------------------------------

function walk(dir: string, out: string[]) {
  let entries;
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const entry of entries) {
    const full = resolve(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else if (entry.isFile() && (entry.name.endsWith(".json") || entry.name.endsWith(".json.gz"))) out.push(full);
  }
}

function globToRegExp(pattern: string): RegExp {
  // On Windows `sep` is `\`; interpolating it raw yields `[^\]`, an invalid class.
  const sepClass = sep === "\\" ? "\\\\" : sep;
  let source = "";
  for (let i = 0; i < pattern.length; i++) {
    const char = pattern[i];
    if (char === "*") {
      if (pattern[i + 1] === "*") {
        source += ".*";
        i++;
        if (pattern[i + 1] === sep) i++;
      } else {
        source += `[^${sepClass}]*`;
      }
    } else if (char === "?") {
      source += `[^${sepClass}]`;
    } else {
      source += char.replace(/[\\^$.*+?()[\]{}|]/g, "\\$&");
    }
  }
  return new RegExp(`^${source}$`);
}

/** Expands files, directories and globs into a sorted list of trace files. */
export function resolveScanTargets(targets: string[]): string[] {
  const files = new Set<string>();
  for (const target of targets) {
    if (/[*?[\]]/.test(target)) {
      const absolute = resolve(target);
      const wildcard = absolute.search(/[*?[\]]/);
      const base = absolute.slice(0, wildcard);
      const dir = base.endsWith(sep) ? base : dirname(base);
      const found: string[] = [];
      walk(dir, found);
      const re = globToRegExp(absolute);
      for (const file of found) if (re.test(file)) files.add(file);
      continue;
    }
    const absolute = resolve(target);
    let stat;
    try {
      stat = statSync(absolute);
    } catch {
      throw new Error(`Target path not found: ${target}`);
    }
    if (stat.isDirectory()) {
      const found: string[] = [];
      walk(absolute, found);
      for (const file of found) files.add(file);
    } else if (stat.isFile() && (absolute.endsWith(".json") || absolute.endsWith(".json.gz"))) {
      files.add(absolute);
    }
  }
  const sorted = [...files].sort();
  if (!sorted.length) {
    throw new Error(`No trace files (.json, .json.gz) found matching: ${targets.join(", ")}`);
  }
  return sorted;
}

export interface ScanOptions {
  names?: string[];
  category?: string;
  phase?: string;
  grep?: string;
  fields?: string[];
  limit?: number;
}

export function scanTraces(targets: string[], options: ScanOptions = {}): ScanReport {
  const { names, category, phase, grep, fields, limit = 50 } = options;
  if (!names?.length && !category && !phase && !grep && !fields?.length) {
    throw new Error("Provide at least one filter: --name, --cat, --phase, --grep or --fields.");
  }
  const files = resolveScanTargets(targets);
  const namesSet = names?.length ? new Set(names) : null;
  const leaves = fields?.map((field) => field.split(".").pop() ?? field);
  const matchedFiles: ScanReport["matchedFiles"] = [];
  const skippedFiles: ScanReport["skippedFiles"] = [];
  let totalEventsMatched = 0;

  for (const file of files) {
    let text: string;
    try {
      text = decompress(readFileSync(file));
    } catch (err) {
      skippedFiles.push({
        file: relative(process.cwd(), file),
        reason: err instanceof Error ? err.message : String(err),
      });
      continue;
    }

    let rawEvents: unknown[];
    try {
      rawEvents = parseTraceJson(text);
    } catch (err) {
      skippedFiles.push({
        file: relative(process.cwd(), file),
        reason: err instanceof Error ? err.message : "invalid trace JSON",
      });
      continue;
    }

    // Text prefilters are only an optimization once the file is known to parse.
    if (grep && !text.includes(grep)) continue;
    if (names?.length && !names.some((name) => text.includes(name))) continue;
    if (category && !text.includes(category)) continue;
    if (leaves?.length && !leaves.every((leaf) => text.includes(leaf))) continue;

    let matchCount = 0;
    const categories = new Set<string>();
    let firstEventName: string | undefined;
    let firstEventRawTs: number | undefined;
    let fileMinTs = Infinity;
    // Metadata events (thread_name, process_name) often carry ts: 0 and would
    // otherwise make every relative timestamp look like it starts at zero.
    let fileMinPositiveTs = Infinity;
    for (const raw of rawEvents) {
      if (!raw || typeof raw !== "object") continue;
      const event = raw as { name?: string; cat?: string; ph?: string; ts?: number };
      if (typeof event.ts === "number" && Number.isFinite(event.ts)) {
        if (event.ts < fileMinTs) fileMinTs = event.ts;
        if (event.ts > 0 && event.ts < fileMinPositiveTs) fileMinPositiveTs = event.ts;
      }
      if (namesSet && !namesSet.has(event.name ?? "")) continue;
      if (category && !(event.cat === category || event.cat?.split(",").includes(category))) continue;
      if (phase && event.ph !== phase) continue;
      if (grep) {
        const hit =
          (event.name ?? "").includes(grep) ||
          Boolean(event.cat?.includes(grep)) ||
          JSON.stringify((event as { args?: unknown }).args ?? "").includes(grep);
        if (!hit) continue;
      }
      if (fields?.length && !fields.every((field) => getProperty(raw, field) !== undefined)) continue;
      matchCount++;
      if (event.cat) categories.add(event.cat);
      if (firstEventName === undefined) {
        firstEventName = event.name || "(anonymous)";
        firstEventRawTs = event.ts;
      }
    }

    const origin = Number.isFinite(fileMinPositiveTs) ? fileMinPositiveTs : fileMinTs;
    if (matchCount > 0) {
      totalEventsMatched += matchCount;
      matchedFiles.push({
        file: relative(process.cwd(), file),
        matchCount,
        categories: [...categories].sort(),
        firstEventName,
        firstEventTsMs:
          firstEventRawTs !== undefined && Number.isFinite(origin)
            ? round(Math.max(0, ms(firstEventRawTs - origin)))
            : undefined,
      });
    }
  }

  matchedFiles.sort((a, b) => b.matchCount - a.matchCount || a.file.localeCompare(b.file));
  return {
    command: "scan",
    query: { names, category, phase, grep, fields },
    totalFilesScanned: files.length,
    totalFilesMatched: matchedFiles.length,
    totalFilesSkipped: skippedFiles.length,
    totalEventsMatched,
    skippedFiles: skippedFiles.slice(0, limit),
    matchedFiles: matchedFiles.slice(0, limit),
  };
}
