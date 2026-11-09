/** `args.data` of a Chrome trace event: an untyped, per-event-name bag read defensively below. */
type TraceData = { [key: string]: any };
type CpuProfileNode = {
  id: number;
  parent?: number;
  callFrame?: { functionName?: string; url?: string; lineNumber?: number };
};

export type TraceEvent = {
  name: string;
  ph: string;
  ts: number;
  dur?: number;
  pid: number;
  tid: number;
  id?: string | number;
  cat?: string;
  args?: Record<string, unknown>;
};

export type Slice = {
  name: string;
  start: number; // ms from trace start
  dur: number; // ms
  depth: number;
  args?: Record<string, unknown>;
};

export type Track = {
  id: string;
  label: string;
  slices: Slice[];
  maxDepth: number;
};

export type Marker = {
  name: string;
  label: string;
  time: number;
  detail?: string;
  size?: number;
  /** LCP candidates only: DOM node, element type and, for images, the loaded URL. */
  nodeId?: number;
  type?: string;
  url?: string;
  imageLoadStart?: number;
  imageLoadEnd?: number;
  imageDiscoveryTime?: number;
};
export type LayoutShiftEntry = { time: number; score: number; nodes: string[]; hadInput: boolean };
/** One user interaction (`EventTiming`), with the INP subparts DevTools shows. Times are ms from trace start. */
export type InteractionEntry = {
  type: string;
  interactionId: number;
  start: number;
  duration: number;
  inputDelay: number;
  processing: number;
  presentation: number;
  target?: string;
};
export type ProfileNode = { id: number; parent?: number; fn: string; url: string; line: number };
/** V8 sampling profile: sample i was taken at times[i] (ms) in node nodeIds[i]; weights[i] is its duration (ms). */
export type CpuProfile = { times: Float64Array; nodeIds: Int32Array; weights: Float64Array; nodes: Map<number, ProfileNode> };
export type Navigation = { time: number; url: string; frame: string };
export type Screenshot = { time: number; data: string };

export type TraceRequest = {
  url: string;
  resourceType?: string;
  priority?: string;
  renderBlocking?: string;
  isLinkPreload?: boolean;
  statusCode?: number;
  mimeType?: string;
  protocol?: string;
  fromCache?: boolean;
  start: number; // ms
  end: number; // ms
  /** Response headers received (TTFB for the document), ms. */
  headersAt?: number;
  transferSize?: number;
  resourceSize?: number;
};

export type ParsedTrace = {
  requests: TraceRequest[];
  navigation?: Navigation;
  profile?: CpuProfile;
  lcpCandidates: Marker[];
  layoutShifts: LayoutShiftEntry[];
  duration: number;
  tracks: Track[];
  markers: Marker[];
  screenshots: Screenshot[];
  longTasks: Slice[];
  interactions: InteractionEntry[];
};

const TRACK_THREADS = [
  "CrRendererMain",
  "Compositor",
  "CrGpuMain",
  "VizCompositorThread",
  "CrBrowserMain",
];
const THREAD_LABELS: Record<string, string> = {
  CrRendererMain: "Main thread",
  Compositor: "Compositor",
  CrGpuMain: "GPU",
  VizCompositorThread: "Viz compositor",
  CrBrowserMain: "Browser main",
};
const MARKERS: Record<string, string> = {
  firstPaint: "FP",
  firstContentfulPaint: "FCP",
  "largestContentfulPaint::Candidate": "LCP",
  domContentLoadedEventEnd: "DCL",
  loadEventEnd: "Load",
};
const NOISE = /^(v8::Debugger::|RunTask$|ThreadControllerImpl::RunTask|ThreadPool_RunTask)/;
export const LONG_TASK_MS = 50;

export function extractEvents(json: unknown): TraceEvent[] {
  if (Array.isArray(json)) return json as TraceEvent[];
  const events = (json as { traceEvents?: unknown })?.traceEvents;
  if (!Array.isArray(events)) throw new Error("Not a Chrome trace: missing traceEvents");
  return events as TraceEvent[];
}

type Raw = { name: string; ts: number; dur: number; args?: Record<string, unknown> };

// Large traces: keep args only for slices long enough to be worth inspecting,
// and cap how many screenshots (large base64 blobs) are retained.
const ARGS_MIN_DUR_US = 1000;
const MAX_SCREENSHOTS = 300;
const MAX_INTERNED_NAMES = 50_000;

function layoutDepths(raw: Raw[], t0: number) {
  raw.sort((a, b) => a.ts - b.ts || b.dur - a.dur);
  const stack: number[] = [];
  const slices: Slice[] = [];
  let maxDepth = 0;
  for (const e of raw) {
    while (stack.length && stack[stack.length - 1] <= e.ts) stack.pop();
    const depth = stack.length;
    stack.push(e.ts + e.dur);
    if (depth > maxDepth) maxDepth = depth;
    slices.push({ name: e.name, start: (e.ts - t0) / 1000, dur: e.dur / 1000, depth, args: e.args });
  }
  return { slices, maxDepth };
}

/**
 * Single-pass, memory-bounded trace reducer. Events are fed one at a time and
 * only what the timeline needs is retained, so the full event list never has
 * to exist in memory.
 */
export class TraceBuilder {
  private t0 = Infinity;
  private t1 = -Infinity;
  private names = new Map<string, string>();
  private counts = new Map<string, number>();
  private buffers = new Map<string, Raw[]>();
  private longCandidates: { key: string; ts: number; dur: number }[] = [];
  private markers: {
    name: string;
    pid: number;
    ts: number;
    frame?: string;
    detail?: string;
    size?: number;
    nodeId?: number;
    type?: string;
    imageLoadStart?: number;
    imageLoadEnd?: number;
    imageDiscoveryTime?: number;
  }[] = [];
  private eventTimingStarts: {
    id: string;
    pid: number;
    frame?: string;
    ts: number;
    type: string;
    interactionId: number;
    timeStamp: number;
    processingStart: number;
    processingEnd: number;
    target?: string;
  }[] = [];
  private eventTimingEnds: { id: string; pid: number; frame?: string; ts: number }[] = [];
  private imagePaints: { pid: number; nodeId: number; url: string }[] = [];
  private navs: { ts: number; url: string; frame: string }[] = [];
  private shifts: { ts: number; pid: number; score: number; nodes: string[]; hadInput: boolean }[] = [];
  private shots: { ts: number; data: string }[] = [];
  private shotGap = 0;
  private prof = { start: 0, ts: 0, nodes: new Map<number, ProfileNode>(), times: [] as number[], ids: [] as number[], live: false };
  private resourceEvents: { name: string; pid: number; ts: number; data: TraceData }[] = [];
  private interned = new Map<string, string>();

  private intern(s: string) {
    const hit = this.interned.get(s);
    if (hit !== undefined) return hit;
    if (this.interned.size < MAX_INTERNED_NAMES) this.interned.set(s, s);
    return s;
  }

  add(e: TraceEvent) {
    const key = `${e.pid}:${e.tid}`;
    if (e.ph === "M") {
      if (e.name === "thread_name") {
        const n = String(e.args?.name ?? "");
        this.names.set(key, n);
        if (!TRACK_THREADS.includes(n)) this.buffers.delete(key);
      }
      return;
    }
    if (typeof e.ts !== "number" || e.ts <= 0) return;
    if (e.name === "Profile" && e.ph === "P" && !this.prof.live) {
      this.prof.start = Number((e.args?.data as { startTime?: number } | undefined)?.startTime) || e.ts;
      this.prof.ts = this.prof.start;
      this.prof.live = true;
    } else if (e.name === "ProfileChunk" && this.prof.live) {
      const data = (e.args?.data ?? {}) as { cpuProfile?: { nodes?: CpuProfileNode[]; samples?: number[] }; timeDeltas?: number[] };
      for (const n of data.cpuProfile?.nodes ?? []) {
        const cf = n.callFrame ?? {};
        this.prof.nodes.set(n.id, { id: n.id, parent: n.parent, fn: this.intern(cf.functionName || "(anonymous)"), url: this.intern(cf.url ?? ""), line: cf.lineNumber ?? 0 });
      }
      const samples = data.cpuProfile?.samples ?? [];
      const deltas = data.timeDeltas ?? [];
      for (let i = 0; i < samples.length; i++) {
        this.prof.ts += deltas[i] ?? 0;
        this.prof.times.push(this.prof.ts);
        this.prof.ids.push(samples[i]);
      }
      return;
    }
    if (e.name === "ResourceSendRequest" || e.name === "ResourceReceiveResponse" || e.name === "ResourceFinish") {
      const d = (e.args?.data ?? {}) as TraceData;
      this.resourceEvents.push({
        name: e.name,
        pid: e.pid,
        ts: e.ts,
        data: e.name === "ResourceSendRequest"
          ? d
          : { requestId: d.requestId, statusCode: d.statusCode, mimeType: d.mimeType, protocol: d.protocol, fromCache: d.fromCache, encodedDataLength: d.encodedDataLength, decodedBodyLength: d.decodedBodyLength, finishTime: d.finishTime, timing: d.timing },
      });
    }
    if (e.ts < this.t0) this.t0 = e.ts;
    const end = e.ts + (e.dur ?? 0);
    if (end > this.t1) this.t1 = end;

    if (e.name === "EventTiming") {
      const d = (e.args?.data ?? {}) as TraceData;
      const id = String(e.id ?? "");
      if (e.ph === "b") {
        const interactionId = Number(d.interactionId);
        const duration = Number(d.duration);
        if (interactionId > 0 && duration >= 1 && id) {
          this.eventTimingStarts.push({
            id,
            pid: e.pid,
            frame: e.args?.frame as string | undefined,
            ts: e.ts,
            type: String(d.type ?? "interaction"),
            interactionId,
            timeStamp: Number(d.timeStamp),
            processingStart: Number(d.processingStart),
            processingEnd: Number(d.processingEnd),
            target: d.nodeName ? String(d.nodeName) : undefined,
          });
        }
      } else if (e.ph === "e") {
        this.eventTimingEnds.push({ id, pid: e.pid, frame: e.args?.frame as string | undefined, ts: e.ts });
      }
      return;
    }
    if (e.name === "LargestImagePaint::Candidate") {
      const d = (e.args?.data ?? {}) as TraceData;
      if (d.DOMNodeId != null && d.imageUrl) {
        this.imagePaints.push({ pid: e.pid, nodeId: Number(d.DOMNodeId), url: String(d.imageUrl) });
      }
      return;
    }

    if (e.ph === "X") {
      this.counts.set(key, (this.counts.get(key) ?? 0) + 1);
      if (e.dur && e.dur > 0) {
        if (e.name === "RunTask" && e.dur / 1000 >= LONG_TASK_MS) this.longCandidates.push({ key, ts: e.ts, dur: e.dur });
        if (!NOISE.test(e.name)) {
          const n = this.names.get(key);
          if (n === undefined || TRACK_THREADS.includes(n)) {
            let arr = this.buffers.get(key);
            if (!arr) this.buffers.set(key, (arr = []));
            arr.push({ name: this.intern(e.name), ts: e.ts, dur: e.dur, args: e.dur >= ARGS_MIN_DUR_US ? e.args : undefined });
          }
        }
        return;
      }
    }
    if (e.name === "navigationStart") {
      const d = (e.args?.data ?? {}) as TraceData;
      if (d.isOutermostMainFrame && d.documentLoaderURL) this.navs.push({ ts: e.ts, url: d.documentLoaderURL, frame: String(e.args?.frame ?? "") });
    } else if (e.name === "LayoutShift") {
      const d = (e.args?.data ?? {}) as TraceData;
      if (d.is_main_frame !== false) {
        const nodes = ((d.impacted_nodes ?? []) as {
          node_id?: unknown;
          debug_name?: unknown;
          tag_name?: unknown;
          node_name?: unknown;
        }[])
          .map((n) =>
            String(
              n.debug_name ??
                n.tag_name ??
                n.node_name ??
                (n.node_id != null ? `Node #${n.node_id}` : ""),
            ),
          )
          .filter(Boolean)
          .slice(0, 4);
        this.shifts.push({ ts: e.ts, pid: e.pid, score: Number(d.score) || 0, hadInput: !!d.had_recent_input, nodes });
      }
    }
    if (e.name in MARKERS && (e.ph === "R" || e.ph === "I" || e.ph === "i" || e.ph === "O")) {
      {
        const d = (e.args?.data ?? {}) as TraceData;
        this.markers.push({
          name: e.name,
          pid: e.pid,
          ts: e.ts,
          frame: e.args?.frame as string | undefined,
          detail: d.nodeName ? `${d.nodeName}${d.type ? ` (${d.type})` : ""}` : undefined,
          size: d.size,
          nodeId: d.nodeId != null ? Number(d.nodeId) : undefined,
          type: d.type ? String(d.type) : undefined,
          imageLoadStart: d.imageLoadStart != null ? Number(d.imageLoadStart) : undefined,
          imageLoadEnd: d.imageLoadEnd != null ? Number(d.imageLoadEnd) : undefined,
          imageDiscoveryTime: d.imageDiscoveryTime != null ? Number(d.imageDiscoveryTime) : undefined,
        });
      }
    } else if (e.name === "Screenshot" && typeof e.args?.snapshot === "string") {
      const last = this.shots[this.shots.length - 1];
      if (last && Math.abs(e.ts - last.ts) < this.shotGap) return;
      this.shots.push({ ts: e.ts, data: e.args.snapshot });
      if (this.shots.length > MAX_SCREENSHOTS) {
        this.shots = this.shots.filter((_, i) => i % 2 === 0);
        const ts = this.shots.map((s) => s.ts);
        this.shotGap = (Math.max(...ts) - Math.min(...ts)) / (MAX_SCREENSHOTS / 2);
      }
    }
  }

  finish(): ParsedTrace {
    const { t0, t1 } = this;
    if (!isFinite(t0)) throw new Error("Trace has no timed events");

    // Per thread name, the busiest pid:tid wins (ignores idle/other renderers).
    const chosen = new Map<string, string>();
    for (const [key, name] of this.names) {
      if (!TRACK_THREADS.includes(name)) continue;
      const prev = chosen.get(name);
      if (!prev || (this.counts.get(key) ?? 0) > (this.counts.get(prev) ?? 0)) chosen.set(name, key);
    }
    const rendererKey = chosen.get("CrRendererMain");
    const rendererPid = rendererKey?.split(":")[0];

    // Scope everything to the first real top-level navigation (traces often hold several).
    const nav = this.navs.find((n) => n.ts >= t0) ?? this.navs[0];
    // `LargestImagePaint::Candidate` maps an LCP node id to the image URL that was painted.
    const imageUrlByNode = new Map<string, string>();
    for (const p of this.imagePaints) imageUrlByNode.set(`${p.pid}:${p.nodeId}`, p.url);
    const found: Marker[] = [];
    for (const m of this.markers) {
      if (rendererPid && String(m.pid) !== rendererPid) continue;
      if (nav && m.frame && m.frame !== nav.frame) continue;
      found.push({
        name: m.name,
        label: MARKERS[m.name],
        time: (m.ts - t0) / 1000,
        detail: m.detail,
        size: m.size,
        nodeId: m.nodeId,
        type: m.type,
        url: m.nodeId != null ? imageUrlByNode.get(`${m.pid}:${m.nodeId}`) : undefined,
        imageLoadStart: m.imageLoadStart,
        imageLoadEnd: m.imageLoadEnd,
        imageDiscoveryTime: m.imageDiscoveryTime,
      });
    }
    const lcpCandidates = found.filter((m) => m.name === "largestContentfulPaint::Candidate").sort((a, b) => a.time - b.time);
    const layoutShifts = this.shifts
      .filter((x) => !rendererPid || String(x.pid) === rendererPid)
      .map((x) => ({ time: (x.ts - t0) / 1000, score: x.score, nodes: x.nodes, hadInput: x.hadInput }));
    // Keep the first of each marker kind, except LCP (last candidate wins).
    const seen = new Map<string, Marker>();
    for (const m of found.sort((a, b) => a.time - b.time)) {
      if (m.name === "largestContentfulPaint::Candidate" || !seen.has(m.name)) seen.set(m.name, m);
    }

    const tracks: Track[] = [];
    for (const name of TRACK_THREADS) {
      const key = chosen.get(name);
      const raw = key ? this.buffers.get(key) : undefined;
      if (!key || !raw?.length) continue;
      const { slices, maxDepth } = layoutDepths(raw, t0);
      tracks.push({ id: key, label: THREAD_LABELS[name], slices, maxDepth });
    }

    // Long tasks come from RunTask on the renderer main thread (filtered out of slices).
    const longTasks: Slice[] = this.longCandidates
      .filter((c) => c.key === rendererKey)
      .map((c) => ({ name: "Long task", start: (c.ts - t0) / 1000, dur: c.dur / 1000, depth: 0 }));

    const screenshots = this.shots
      .map((s) => ({ time: (s.ts - t0) / 1000, data: s.data }))
      .sort((a, b) => a.time - b.time);
    const reqs = new Map<string, TraceRequest>();
    for (const e of this.resourceEvents) {
      if (rendererPid && String(e.pid) !== rendererPid) continue;
      const d = e.data;
      const id = d.requestId as string | undefined;
      const ms = (e.ts - t0) / 1000;
      if (!id) continue;
      if (e.name === "ResourceSendRequest") {
        if (!reqs.has(id)) {
          reqs.set(id, { url: d.url, resourceType: d.resourceType, priority: d.priority, renderBlocking: d.renderBlocking, isLinkPreload: d.isLinkPreload, start: ms, end: ms });
        }
        continue;
      }
      const r = reqs.get(id);
      if (!r) continue;
      if (e.name === "ResourceFinish") {
        // `ResourceFinish.ts` fires after decode; DevTools' network finish (and
        // the LCP subparts) use `finishTime`, which is seconds on the trace clock.
        const finish = typeof d.finishTime === "number" && Number.isFinite(d.finishTime) ? d.finishTime : undefined;
        const finishMs = finish !== undefined ? (finish * 1e6 - t0) / 1000 : ms;
        r.end = Math.max(r.end, finishMs);
        r.transferSize = d.encodedDataLength; r.resourceSize = d.decodedBodyLength;
        continue;
      }
      r.end = Math.max(r.end, ms);
      if (e.name === "ResourceReceiveResponse") {
        const tm = d.timing as { requestTime?: number; receiveHeadersEnd?: number } | undefined;
        if (tm?.requestTime && tm.receiveHeadersEnd != null) r.headersAt = (tm.requestTime * 1e6 + tm.receiveHeadersEnd * 1000 - t0) / 1000;
        r.statusCode = d.statusCode; r.mimeType = d.mimeType; r.protocol = d.protocol; r.fromCache = d.fromCache;
      }
    }
    let profile: CpuProfile | undefined;
    const n = this.prof.times.length;
    if (n > 1) {
      const times = new Float64Array(n), weights = new Float64Array(n), nodeIds = Int32Array.from(this.prof.ids);
      for (let i = 0; i < n; i++) {
        times[i] = (this.prof.times[i] - t0) / 1000;
        weights[i] = i + 1 < n ? (this.prof.times[i + 1] - this.prof.times[i]) / 1000 : 0;
      }
      profile = { times, nodeIds, weights, nodes: this.prof.nodes };
    }

    // Pair EventTiming begin/end events (async nestable) into INP interactions.
    // Scope to the main renderer, the navigated frame and events after the
    // navigation: a trace can contain several documents/frames.
    const navStart = nav?.ts ?? -Infinity;
    const navFrame = nav?.frame;
    const inScope = (e: { pid: number; frame?: string; ts: number }) =>
      (!rendererPid || String(e.pid) === rendererPid) &&
      (!navFrame || !e.frame || e.frame === navFrame) &&
      e.ts >= navStart;
    const timingEvents = [
      ...this.eventTimingStarts
        .filter(inScope)
        .map((s) => ({ kind: "b" as const, id: s.id, ts: s.ts, start: s })),
      ...this.eventTimingEnds
        .filter(inScope)
        .map((e) => ({ kind: "e" as const, id: e.id, ts: e.ts, end: e })),
    ].sort((a, b) => a.ts - b.ts);
    const openTimings = new Map<string, (typeof this.eventTimingStarts)[number][]>();
    const interactions: InteractionEntry[] = [];
    for (const ev of timingEvents) {
      if (ev.kind === "b") {
        const list = openTimings.get(ev.id) ?? [];
        list.push(ev.start);
        openTimings.set(ev.id, list);
        continue;
      }
      const begin = openTimings.get(ev.id)?.pop();
      if (!begin) continue;
      const duration = (ev.end.ts - begin.ts) / 1000;
      if (!(duration > 0)) continue;
      // `timeStamp`, `processingStart` and `processingEnd` are ms on the performance timeline;
      // the trace's own timestamps are µs, so differences are already the durations we want.
      const inputDelay = Math.max(0, begin.processingStart - begin.timeStamp);
      const processing = Math.max(0, begin.processingEnd - begin.processingStart);
      if (!Number.isFinite(inputDelay) || !Number.isFinite(processing)) continue;
      interactions.push({
        type: begin.type,
        interactionId: begin.interactionId,
        start: (begin.ts - t0) / 1000,
        duration,
        inputDelay,
        processing,
        presentation: Math.max(0, duration - inputDelay - processing),
        target: begin.target,
      });
    }

    return { profile, navigation: nav && { time: (nav.ts - t0) / 1000, url: nav.url, frame: nav.frame }, lcpCandidates, layoutShifts, requests: [...reqs.values()].filter((r) => r.url?.startsWith("http")), duration: (t1 - t0) / 1000, tracks, markers: [...seen.values()], screenshots, longTasks, interactions };
  }
}

export function parseTrace(json: unknown): ParsedTrace {
  const b = new TraceBuilder();
  for (const e of extractEvents(json)) b.add(e);
  return b.finish();
}

const CATEGORY_RULES: [RegExp, string][] = [
  [/^(FunctionCall|EvaluateScript|v8\.|V8\.|EventDispatch|TimerFire|FireAnimationFrame|RunMicrotasks|HitTest|ScriptCatchup|ParseHTML)/, "script"],
  [/^(Layout|UpdateLayoutTree|RecalculateStyles|ScheduleStyleRecalculation|InvalidateLayout)/, "layout"],
  [/(Paint|Layerize|Commit|UpdateLayer|CompositeLayers|RasterTask|Raster|Draw|Swap|Pipeline)/, "paint"],
  [/(GC|MajorGC|MinorGC|BlinkGC)/, "gc"],
  [/^(ResourceSend|ResourceReceive|ResourceFinish|XHR|Network)/, "network"],
];

export type Category = "script" | "layout" | "paint" | "gc" | "network" | "other";
export function categorize(name: string): Category {
  for (const [re, cat] of CATEGORY_RULES) if (re.test(name)) return cat as Category;
  return "other";
}

function topByDuration(slices: Slice[], n: number) {
  const top: Slice[] = [];
  for (const s of slices) {
    if (top.length < n || s.dur > top[top.length - 1].dur) {
      top.push(s);
      top.sort((a, b) => b.dur - a.dur);
      if (top.length > n) top.pop();
    }
  }
  return top;
}

export function summarizeTrace(t: ParsedTrace) {
  const main = t.tracks[0];
  const totals: Record<string, number> = {};
  for (const s of main?.slices ?? []) {
    if (s.depth !== 0) continue;
    const c = categorize(s.name);
    totals[c] = (totals[c] ?? 0) + s.dur;
  }
  return {
    durationMs: t.duration,
    hasCpuProfile: !!t.profile,
    navigation: t.navigation,
    lcpCandidates: t.lcpCandidates.map(({ time, detail, size }) => ({ timeMs: time, node: detail, size })),
    layoutShifts: t.layoutShifts.map(({ time, score }) => ({ timeMs: time, score })),
    markers: t.markers.map(({ label, time }) => ({ label, timeMs: time })),
    longTasks: t.longTasks.map(({ start, dur }) => ({ startMs: start, durMs: dur })),
    tracks: t.tracks.map((k) => ({ label: k.label, slices: k.slices.length, maxDepth: k.maxDepth })),
    topSlices: topByDuration(main?.slices ?? [], 15).map(({ name, start, dur }) => ({ name, startMs: start, durMs: dur })),
    mainThreadMsByCategory: totals,
    screenshots: t.screenshots.length,
  };
}
