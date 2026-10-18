import type {
  CodeCoverage,
  CombinedLoad,
  CombinedLongTask,
  CombinedRequest,
  PreconnectCandidate,
  UserTiming,
} from "./collectTimelineSources";
import { formatBytes, formatMs, shortUrl } from "@/features/page-speed-insights/shared/format";
import type {
  PhaseId,
  TimelineEvent,
  TimelineNote,
  TimelineTable,
  TimelineWaterfallBar,
} from "./types";

const PHASE_ORDER: PhaseId[] = [
  "navigation",
  "connection",
  "requestResponse",
  "parsingHead",
  "firstRender",
  "parsingComplete",
  "subresources",
  "afterLoad",
];

const PHASE_TITLES: Record<PhaseId, string> = {
  navigation: "Navigation start",
  connection: "Connection",
  requestResponse: "Request / response",
  parsingHead: "Parsing the head",
  firstRender: "First render",
  parsingComplete: "Parsing complete",
  subresources: "Subresources finish",
  afterLoad: "After load",
};

/** Short tasks that start within this window of the previous short task join one row. */
const SHORT_TASK_START_WINDOW_MS = 10;
/** Short tasks that begin this soon after the previous short task ends are contiguous. */
const SHORT_TASK_CONTIGUOUS_GAP_MS = 1;
/** Chrome / Lighthouse long-task threshold. */
const LONG_TASK_MS = 50;

type PhaseBound = {
  id: PhaseId;
  title: string;
  startMs: number;
};

function formatCoverage(coverage: CodeCoverage): string {
  const wastedBytes = Math.max(0, coverage.wastedBytes);
  const totalBytes = Math.max(coverage.totalBytes, wastedBytes);
  const usedBytes = totalBytes - wastedBytes;
  const usedPercent = totalBytes > 0 ? Math.round((usedBytes / totalBytes) * 100) : 0;
  if (wastedBytes <= 0) return `${usedPercent}% used · ${formatBytes(totalBytes)}`;
  return `${usedPercent}% used · ${formatBytes(usedBytes)} used of ${formatBytes(totalBytes)} · ${formatBytes(wastedBytes)} unused`;
}

function coverageLabel(request: CombinedRequest): string | undefined {
  return request.coverage ? formatCoverage(request.coverage) : undefined;
}

function isLongTask(task: CombinedLongTask): boolean {
  return task.duration >= LONG_TASK_MS;
}

/** Short tasks join when contiguous (end→start) or starts within the start window. */
function shortTasksAdjacent(prev: CombinedLongTask, next: CombinedLongTask): boolean {
  const startDelta = next.startTime - prev.startTime;
  const gap = next.startTime - (prev.startTime + prev.duration);
  return startDelta <= SHORT_TASK_START_WINDOW_MS || gap <= SHORT_TASK_CONTIGUOUS_GAP_MS;
}

/**
 * Long tasks always stand alone. Short tasks (&lt;50ms) collapse when adjacent.
 * A long task flushes any pending short group.
 */
function groupMainThreadTasks(tasks: CombinedLongTask[]): CombinedLongTask[][] {
  const ordered = [...tasks].sort(
    (a, b) => a.startTime - b.startTime || b.duration - a.duration,
  );
  const groups: CombinedLongTask[][] = [];
  let shortGroup: CombinedLongTask[] = [];

  function flushShorts() {
    if (shortGroup.length) {
      groups.push(shortGroup);
      shortGroup = [];
    }
  }

  for (const task of ordered) {
    if (isLongTask(task)) {
      flushShorts();
      groups.push([task]);
      continue;
    }
    const prev = shortGroup[shortGroup.length - 1];
    if (prev && shortTasksAdjacent(prev, task)) {
      shortGroup.push(task);
    } else {
      flushShorts();
      shortGroup = [task];
    }
  }
  flushShorts();
  return groups;
}

function pluralResourceTitle(resourceType: string, count: number): string {
  if (count === 1) return resourceType;
  if (resourceType === "Script") return `${count} Scripts`;
  if (resourceType === "Stylesheet") return `${count} Stylesheets`;
  if (resourceType === "Font") return `${count} Fonts`;
  if (resourceType === "Image") return `${count} Images`;
  if (resourceType === "Document") return `${count} Documents`;
  if (resourceType === "Fetch") return `${count} Fetches`;
  if (resourceType === "XHR") return `${count} XHRs`;
  return `${count} ${resourceType}s`;
}

function requestType(request: CombinedRequest): string {
  return request.resourceType ?? "Request";
}

function requestStart(request: CombinedRequest): number {
  return request.networkRequestTime;
}

function differentTypeStartsBetween(
  requests: CombinedRequest[],
  group: CombinedRequest[],
  start: number,
  type: string,
): boolean {
  const previousStart = requestStart(group[group.length - 1]!);
  if (start <= previousStart) return false;
  return requests.some(
    (other) =>
      requestType(other) !== type &&
      requestStart(other) > previousStart &&
      requestStart(other) < start,
  );
}

function groupDownloads(requests: CombinedRequest[]): CombinedRequest[][] {
  const sorted = [...requests].sort(
    (a, b) => requestStart(a) - requestStart(b) || a.url.localeCompare(b.url),
  );
  const groups: CombinedRequest[][] = [];
  const latestByType = new Map<string, CombinedRequest[]>();

  for (const request of sorted) {
    const type = requestType(request);
    const start = requestStart(request);
    const group = latestByType.get(type);

    if (group && !differentTypeStartsBetween(sorted, group, start, type)) {
      group.push(request);
    } else {
      const next = [request];
      groups.push(next);
      latestByType.set(type, next);
    }
  }

  return groups.sort((a, b) => requestStart(a[0]!) - requestStart(b[0]!));
}

function criticalChainFlag(longestChainMs: number | undefined): string {
  if (longestChainMs != null && longestChainMs > 0) {
    return `critical chain (${formatMs(longestChainMs)})`;
  }
  return "critical chain";
}

function ttfbStepDetail(
  timeMs: number,
  observed: boolean,
  simulated: number | undefined,
  simulationLabel?: string,
): string {
  if (simulationLabel) {
    return `First byte at ${formatMs(timeMs)} under simulated ${simulationLabel}.`;
  }
  if (!observed) return `First byte at ${formatMs(timeMs)}.`;
  const base = `Observed first byte at ${formatMs(timeMs)}.`;
  if (simulated != null && simulated > timeMs * 1.5) {
    return `${base} The lab score (${formatMs(simulated)}) includes simulated throttling and is not on this trace.`;
  }
  return base;
}

function phaseBounds(load: CombinedLoad): PhaseBound[] {
  const docStart = load.document?.networkRequestTime ?? 0;
  const docEnd = load.document?.networkEndTime;
  const parseStart = load.ttfb ?? docStart;
  const loadTime = load.load ?? load.lcp ?? 0;
  const hasPreconnect = load.preconnectCandidates.length > 0;

  const bounds: PhaseBound[] = [
    { id: "navigation", title: PHASE_TITLES.navigation, startMs: 0 },
  ];
  if (hasPreconnect) {
    bounds.push({ id: "connection", title: PHASE_TITLES.connection, startMs: docStart });
  }
  bounds.push(
    { id: "requestResponse", title: PHASE_TITLES.requestResponse, startMs: docStart },
    { id: "parsingHead", title: PHASE_TITLES.parsingHead, startMs: parseStart },
    {
      id: "firstRender",
      title: PHASE_TITLES.firstRender,
      startMs: docEnd ?? load.ttfb ?? 0,
    },
    {
      id: "parsingComplete",
      title: PHASE_TITLES.parsingComplete,
      startMs: load.dcl ?? load.fcp ?? 0,
    },
    {
      id: "subresources",
      title: PHASE_TITLES.subresources,
      startMs: load.fcp ?? load.dcl ?? 0,
    },
    { id: "afterLoad", title: PHASE_TITLES.afterLoad, startMs: loadTime },
  );

  return bounds;
}

function phaseActiveAt(bounds: PhaseBound[], timeMs: number): PhaseBound {
  let active = bounds[0]!;
  for (const phase of bounds) {
    if (phase.startMs <= timeMs) active = phase;
  }
  return active;
}

function event(
  partial: Omit<TimelineEvent, "evidence" | "status" | "hasTimestamp" | "phaseTitle"> & {
    evidence?: string[];
    status?: TimelineEvent["status"];
    hasTimestamp?: boolean;
    phaseTitle?: string;
  },
  bounds: PhaseBound[],
): TimelineEvent {
  const phase =
    bounds.find((b) => b.id === partial.phaseId) ?? phaseActiveAt(bounds, partial.timeMs);
  return {
    evidence: [],
    status: "measured",
    hasTimestamp: partial.timeMs != null,
    ...partial,
    phaseId: partial.phaseId ?? phase.id,
    phaseTitle: partial.phaseTitle ?? phase.title,
  };
}

function timedEvent(
  id: string,
  title: string,
  detail: string,
  timeMs: number,
  phaseId: PhaseId,
  bounds: PhaseBound[],
  extras: Partial<TimelineEvent> = {},
): TimelineEvent {
  return event(
    {
      id,
      title,
      detail,
      timeMs,
      phaseId,
      kind: "marker",
      ...extras,
    },
    bounds,
  );
}

/** Place an interval at its end; start shows as smaller text above the node. */
function atIntervalEnd(
  startMs: number,
  endMs: number,
): Pick<TimelineEvent, "timeMs" | "startMs" | "endMs"> {
  return { startMs, timeMs: endMs, endMs };
}

function redirectWaterfall(hops: CombinedRequest[]): {
  waterfall: TimelineWaterfallBar[];
  table: TimelineTable;
} {
  return {
    waterfall: hops.map((hop, index) => ({
      id: `nav-redirects-${index}`,
      label: shortUrl(hop.url),
      href: hop.url,
      startMs: hop.networkRequestTime,
      endMs: hop.networkEndTime,
      resourceType: "Redirect",
    })),
    table: {
      headers: [
        { text: "URL" },
        { text: "Start", align: "end" },
        { text: "Duration", align: "end" },
        { text: "Status", align: "end" },
        { text: "Size", align: "end" },
        { text: "Protocol", align: "end" },
      ],
      rows: hops.map((hop) => [
        { text: shortUrl(hop.url), href: hop.url },
        { text: formatMs(hop.networkRequestTime), align: "end" as const },
        {
          text: formatMs(hop.networkEndTime - hop.networkRequestTime),
          align: "end" as const,
        },
        {
          text: hop.statusCode != null ? `status ${hop.statusCode}` : "",
          align: "end" as const,
        },
        {
          text: hop.transferSize != null ? formatBytes(hop.transferSize) : "",
          align: "end" as const,
        },
        { text: hop.protocol ?? "", align: "end" as const },
      ]),
    },
  };
}

function documentNotes(load: CombinedLoad): TimelineNote[] {
  const notes: TimelineNote[] = [];
  if (load.serverThinkMs != null && load.serverStartMs != null && load.serverEndMs != null) {
    notes.push({
      id: "req-server",
      title: "Server think time",
      detail: `Root document server response took ${formatMs(load.serverThinkMs)}.`,
      status: "measured",
      kind: "marker",
      timeMs: load.serverStartMs,
      endMs: load.serverEndMs,
    });
  }
  if (load.ttfb != null) {
    notes.push({
      id: "req-ttfb",
      title: "TTFB",
      detail: ttfbStepDetail(
        load.ttfb,
        load.ttfbObserved,
        load.simulatedTtfb,
        load.simulationLabel,
      ),
      status: "measured",
      kind: "marker",
      timeMs: load.ttfb,
      rating: load.ttfbRating,
    });
  }
  return notes;
}

function networkEvents(load: CombinedLoad, bounds: PhaseBound[]): TimelineEvent[] {
  const notes = documentNotes(load);
  let attachedDocumentNotes = false;
  const groups = groupDownloads(load.requests);
  const events: TimelineEvent[] = [];

  groups.forEach((group, index) => {
    const startMs = Math.min(...group.map((r) => r.networkRequestTime));
    const endMs = Math.max(...group.map((r) => r.networkEndTime));
    const resourceType = group[0]?.resourceType ?? "Request";
    const anyBlocking = group.some((r) => r.renderBlocking === "blocking");
    const anyDocument = group.some((r) => load.document != null && r.url === load.document.url);
    const anyPreload = group.some((r) => r.isLinkPreload);
    const anyCritical = group.some((r) => r.isCriticalChain);
    const totalBytes = group.reduce((sum, r) => sum + (r.transferSize ?? 0), 0);

    const flags = [
      anyDocument ? "document" : null,
      anyPreload ? "preload" : null,
      anyCritical ? criticalChainFlag(load.longestChainMs) : null,
    ].filter(Boolean);

    const singleCoverage = group.length === 1 ? coverageLabel(group[0]!) : undefined;
    const singlePriority = group.length === 1 ? group[0]!.priority : undefined;

    const detail =
      group.length === 1
        ? [
            shortUrl(group[0]!.url),
            group[0]!.statusCode != null ? `status ${group[0]!.statusCode}` : null,
            group[0]!.transferSize != null ? formatBytes(group[0]!.transferSize) : null,
            group[0]!.protocol ?? null,
            singlePriority ? `priority ${singlePriority}` : null,
            flags.length ? flags.join(" · ") : null,
            singleCoverage ?? null,
          ]
            .filter(Boolean)
            .join(" · ") + "."
        : [
            `${group.length} ${resourceType.toLowerCase()} requests`,
            totalBytes > 0 ? formatBytes(totalBytes) : null,
            flags.length ? flags.join(" · ") : null,
          ]
            .filter(Boolean)
            .join(" · ") + ".";

    const attachedNotes = anyDocument && notes.length > 0 ? notes : undefined;
    if (attachedNotes) attachedDocumentNotes = true;

    const showPriority = group.some((r) => r.priority);
    const placement = atIntervalEnd(startMs, endMs);
    const phase = phaseActiveAt(bounds, placement.timeMs);

    events.push(
      event(
        {
          id: `net-${index}`,
          title: pluralResourceTitle(resourceType, group.length),
          detail,
          ...placement,
          phaseId: phase.id,
          kind: anyBlocking ? "blocking" : "marker",
          notes: attachedNotes,
          waterfall: group.map((r, i) => ({
            id: `net-${index}-${i}`,
            label: shortUrl(r.url),
            href: r.url,
            startMs: r.networkRequestTime,
            endMs: r.networkEndTime,
            resourceType: r.resourceType,
            coverage: coverageLabel(r),
            priority: r.priority,
            renderBlocking: r.renderBlocking,
          })),
          table: {
            headers: [
              { text: "URL" },
              { text: "Start", align: "end" },
              { text: "Duration", align: "end" },
              ...(showPriority ? [{ text: "Priority", align: "end" as const }] : []),
            ],
            rows: group.map((r) => [
              { text: shortUrl(r.url), href: r.url },
              { text: formatMs(r.networkRequestTime), align: "end" as const },
              {
                text: formatMs(r.networkEndTime - r.networkRequestTime),
                align: "end" as const,
              },
              ...(showPriority ? [{ text: r.priority ?? "", align: "end" as const }] : []),
            ]),
          },
        },
        bounds,
      ),
    );
  });

  if (!attachedDocumentNotes) {
    for (const note of notes) {
      if (note.timeMs == null) continue;
      const placement =
        note.endMs != null && note.endMs !== note.timeMs
          ? atIntervalEnd(note.timeMs, note.endMs)
          : { timeMs: note.timeMs };
      events.push(
        timedEvent(note.id, note.title, note.detail, placement.timeMs, "requestResponse", bounds, {
          ...placement,
          kind: note.kind,
          rating: note.rating,
        }),
      );
    }
  }

  return events;
}

function longTaskBar(task: CombinedLongTask, id: string): TimelineWaterfallBar {
  const bar: TimelineWaterfallBar = {
    id,
    label: task.url ? shortUrl(task.url) : "Unattributed",
    href: task.url,
    startMs: task.startTime,
    endMs: task.startTime + task.duration,
    resourceType: "Script",
  };
  if (!task.url) return bar;

  if (task.scriptTransferBytes != null) bar.scriptSize = formatBytes(task.scriptTransferBytes);
  if (task.downloadStartMs != null && task.downloadEndMs != null) {
    bar.downloadStartMs = task.downloadStartMs;
    bar.downloadEndMs = task.downloadEndMs;
    bar.downloadDuration = formatMs(Math.max(0, task.downloadEndMs - task.downloadStartMs));
  }
  if (task.coverage) bar.coverage = formatCoverage(task.coverage);
  return bar;
}

function taskGroupDetail(group: CombinedLongTask[], long: boolean): string {
  if (group.length === 1) {
    const task = group[0]!;
    if (long) {
      return task.url
        ? `${shortUrl(task.url)} blocked the main thread for ${formatMs(task.duration)}.`
        : `Unattributed script blocked the main thread for ${formatMs(task.duration)}.`;
    }
    return task.url
      ? `${shortUrl(task.url)} ran on the main thread for ${formatMs(task.duration)}.`
      : `Main thread task lasting ${formatMs(task.duration)}.`;
  }
  const totalDuration = group.reduce((sum, t) => sum + t.duration, 0);
  return `${group.length} short tasks (${formatMs(totalDuration)} total).`;
}

function longTaskEvents(load: CombinedLoad, bounds: PhaseBound[]): TimelineEvent[] {
  if (!load.longTasks.length) return [];

  const groups = groupMainThreadTasks(load.longTasks);
  let longIndex = 0;
  let shortIndex = 0;

  return groups.map((group) => {
    const long = group.some(isLongTask);
    const index = long ? longIndex++ : shortIndex++;
    const idPrefix = long ? "long-task" : "short-task";
    const startMs = Math.min(...group.map((t) => t.startTime));
    const endMs = Math.max(...group.map((t) => t.startTime + t.duration));
    const placement = atIntervalEnd(startMs, endMs);
    const phase = phaseActiveAt(bounds, placement.timeMs);

    return event(
      {
        id: `${idPrefix}-${index}`,
        title: long
          ? "Long task"
          : group.length === 1
            ? "Short task"
            : `${group.length} Short tasks`,
        detail: taskGroupDetail(group, long),
        ...placement,
        phaseId: phase.id,
        kind: long ? "blocking" : "potentially-blocking",
        waterfall: group.map((task, i) => longTaskBar(task, `${idPrefix}-${index}-${i}`)),
        table: {
          headers: [
            { text: "Script" },
            { text: "Start", align: "end" },
            { text: "Duration", align: "end" },
          ],
          rows: group.map((task) => [
            {
              text: task.url ? shortUrl(task.url) : "Unattributed",
              href: task.url,
            },
            { text: formatMs(task.startTime), align: "end" as const },
            { text: formatMs(task.duration), align: "end" as const },
          ]),
        },
      },
      bounds,
    );
  });
}

function userTimingEvents(timings: UserTiming[], bounds: PhaseBound[]): TimelineEvent[] {
  return timings.map((timing, index) => {
    const isMeasure = timing.timingType.toLowerCase() === "measure" && timing.duration != null;
    const placement = isMeasure
      ? atIntervalEnd(timing.startTime, timing.startTime + timing.duration!)
      : { timeMs: timing.startTime };
    const detail = isMeasure
      ? `User timing measure lasting ${formatMs(timing.duration!)}.`
      : "User timing mark.";
    const phase = phaseActiveAt(bounds, placement.timeMs);
    return event(
      {
        id: `user-timing-${index}`,
        title: timing.name,
        detail,
        ...placement,
        phaseId: phase.id,
        kind: "marker",
      },
      bounds,
    );
  });
}

function preconnectEvent(
  preconnectedText: string | undefined,
  candidates: PreconnectCandidate[],
  bounds: PhaseBound[],
): TimelineEvent | null {
  if (!candidates.length) return null;

  const maxSavings = Math.max(...candidates.map((c) => c.wastedMs));
  const lines = [
    preconnectedText ? `${preconnectedText.replace(/\.$/, "")}.` : null,
    `${candidates.length} origin${candidates.length === 1 ? "" : "s"} could save an estimated ${formatMs(
      maxSavings,
    )} on LCP with preconnect.`,
  ].filter(Boolean);

  return event(
    {
      id: "conn-preconnect",
      title: "Preconnect",
      detail: lines.join(" "),
      timeMs: bounds.find((b) => b.id === "connection")?.startMs ?? 0,
      phaseId: "connection",
      kind: "fact",
      hasTimestamp: false,
      evidence: candidates.map((c) => `${c.origin} (~${formatMs(c.wastedMs)} est. LCP savings)`),
      table: {
        headers: [
          { text: "Origin" },
          { text: "Est. LCP savings", align: "end" },
        ],
        rows: candidates.map((c) => [
          { text: c.origin },
          { text: formatMs(c.wastedMs), align: "end" as const },
        ]),
      },
    },
    bounds,
  );
}

function screenshotEvents(load: CombinedLoad, bounds: PhaseBound[]): TimelineEvent[] {
  return load.screenshots.map((shot, index) => {
    const phase = phaseActiveAt(bounds, shot.timing);
    return event(
      {
        id: `screenshot-${index}`,
        title: "Screenshot",
        detail: "",
        timeMs: shot.timing,
        phaseId: phase.id,
        kind: "marker",
        screenshot: { timing: shot.timing, data: shot.data },
      },
      bounds,
    );
  });
}

function milestoneEvents(load: CombinedLoad, bounds: PhaseBound[]): TimelineEvent[] {
  const events: TimelineEvent[] = [];

  events.push(
    timedEvent(
      "nav-start",
      "navigationStart",
      "Lab navigation begins. performance.timeOrigin is set.",
      0,
      "navigation",
      bounds,
    ),
  );

  const hops = load.redirectHops;
  const redirectStart = hops.length
    ? Math.min(...hops.map((hop) => hop.networkRequestTime))
    : load.redirectAuditMs != null && load.redirectAuditMs > 0
      ? 0
      : undefined;
  const redirectEnd = hops.length
    ? Math.max(...hops.map((hop) => hop.networkEndTime))
    : load.redirectAuditMs != null && load.redirectAuditMs > 0
      ? load.redirectAuditMs
      : undefined;

  if (redirectStart != null && redirectEnd != null && redirectEnd > redirectStart) {
    const redirectMs = redirectEnd - redirectStart;
    const placement = atIntervalEnd(redirectStart, redirectEnd);
    events.push(
      timedEvent(
        "nav-redirects",
        "Redirects",
        `${formatMs(redirectMs)} spent on redirects before the document.`,
        placement.timeMs,
        "navigation",
        bounds,
        {
          ...placement,
          kind: "blocking",
          rating: redirectMs > 100 ? "needs-improvement" : "good",
          evidence: hops.length ? hops.map((hop) => hop.url) : load.redirectAuditUrls,
          ...(hops.length ? redirectWaterfall(hops) : {}),
        },
      ),
    );
  }

  if (load.fcp != null) {
    const paintNotes = [
      load.firstPaint != null && Math.abs(load.firstPaint - load.fcp) > 100
        ? `First Paint was ${formatMs(load.firstPaint)}.`
        : null,
      load.firstVisual != null && Math.abs(load.firstVisual - load.fcp) > 100
        ? `First visual change was ${formatMs(load.firstVisual)}.`
        : null,
    ].filter(Boolean);
    events.push(
      timedEvent(
        "render-fcp",
        "FCP",
        [`First Contentful Paint at ${formatMs(load.fcp)}.`, ...paintNotes].join(" "),
        load.fcp,
        "firstRender",
        bounds,
        { kind: "cwv", rating: load.fcpRating },
      ),
    );
  }

  if (load.lcp != null && load.lcpSegments.length) {
    for (const seg of load.lcpSegments) {
      if (seg.subpart === "elementRenderDelay") continue;
      if (seg.durationMs < 100) continue;
      if (load.fcp != null && seg.endMs <= load.fcp) continue;
      const startMs = load.fcp != null ? Math.max(load.fcp, seg.startMs) : seg.startMs;
      if (startMs >= load.lcp) continue;
      const placement = atIntervalEnd(startMs, Math.min(load.lcp, seg.endMs));
      events.push(
        timedEvent(
          `lcp-seg-${seg.subpart}`,
          seg.label,
          `${formatMs(seg.durationMs)} of LCP is ${seg.label.toLowerCase()}.`,
          placement.timeMs,
          "firstRender",
          bounds,
          placement,
        ),
      );
    }
  }

  if (load.dcl != null) {
    events.push(
      timedEvent(
        "parse-dcl",
        "DOMContentLoaded",
        `DOMContentLoaded at ${formatMs(load.dcl)}.`,
        load.dcl,
        "parsingComplete",
        bounds,
      ),
    );
  }

  if (load.lcp != null) {
    const largest = [...load.lcpSegments].sort((a, b) => b.durationMs - a.durationMs)[0];
    const discoveryNotes: TimelineNote[] = load.lcpDiscoveryFailures.map((failure) => ({
      id: `lcp-discovery-${failure.id}`,
      title: "LCP discovery",
      detail: failure.label,
      status: "measured" as const,
      kind: "blocking" as const,
    }));
    const evidence = load.lcpElementLabel ? [`Element: ${load.lcpElementLabel}`] : [];
    events.push(
      timedEvent(
        "sub-lcp",
        "LCP",
        [
          `Largest Contentful Paint at ${formatMs(load.lcp)}.`,
          load.lcpElementLabel ? `Element: ${load.lcpElementLabel}.` : null,
          largest ? `Largest subpart: ${largest.label} (${formatMs(largest.durationMs)}).` : null,
        ]
          .filter(Boolean)
          .join(" "),
        load.lcp,
        "subresources",
        bounds,
        {
          kind: "cwv",
          rating: load.lcpRating,
          evidence,
          notes: discoveryNotes.length ? discoveryNotes : undefined,
          lcpSegments: load.lcpSegments,
        },
      ),
    );
  }

  if (load.load != null) {
    events.push(
      timedEvent(
        "sub-load",
        "window load",
        `Load event at ${formatMs(load.load)}.`,
        load.load,
        "subresources",
        bounds,
      ),
    );
  }

  if (load.lastVisual != null) {
    events.push(
      timedEvent(
        "sub-last-visual",
        "Last visual change",
        `Last visual change at ${formatMs(load.lastVisual)}.`,
        load.lastVisual,
        "subresources",
        bounds,
      ),
    );
  }

  if (load.interactive != null) {
    events.push(
      timedEvent(
        "after-tti",
        "TTI (lab)",
        `Time to Interactive ${formatMs(load.interactive)}.`,
        load.interactive,
        "afterLoad",
        bounds,
      ),
    );
  }

  if (load.traceEnd != null) {
    events.push(
      timedEvent(
        "after-trace-end",
        "Trace end",
        `Performance trace ends at ${formatMs(load.traceEnd)}.`,
        load.traceEnd,
        "afterLoad",
        bounds,
      ),
    );
  }

  const preconnect = preconnectEvent(
    load.preconnectedText,
    load.preconnectCandidates,
    bounds,
  );
  if (preconnect) events.push(preconnect);

  return events;
}

function withPhaseStarts(events: TimelineEvent[]): TimelineEvent[] {
  const seen = new Set<string>();
  for (const item of events) {
    item.isPhaseStart = !seen.has(item.phaseId);
    seen.add(item.phaseId);
  }
  return events;
}

/** Turn a combined load into a single chronological event list. */
export function buildTimelineEvents(load: CombinedLoad): TimelineEvent[] {
  const bounds = phaseBounds(load);
  const events = [
    ...milestoneEvents(load, bounds),
    ...networkEvents(load, bounds),
    ...longTaskEvents(load, bounds),
    ...userTimingEvents(load.userTimings, bounds),
    ...screenshotEvents(load, bounds),
  ];

  events.sort((a, b) => {
    if (a.timeMs !== b.timeMs) return a.timeMs - b.timeMs;
    if (a.phaseId !== b.phaseId) {
      return PHASE_ORDER.indexOf(a.phaseId) - PHASE_ORDER.indexOf(b.phaseId);
    }
    return 0;
  });

  return withPhaseStarts(events);
}

export function axisEndMs(load: CombinedLoad, events: TimelineEvent[]): number {
  return Math.max(
    load.lcp ?? 0,
    load.load ?? 0,
    load.lastVisual ?? 0,
    load.fcp ?? 0,
    load.interactive ?? 0,
    load.traceEnd ?? 0,
    ...load.requests.map((r) => r.networkEndTime),
    ...load.redirectHops.map((r) => r.networkEndTime),
    ...load.longTasks.map((t) => t.startTime + t.duration),
    ...load.screenshots.map((shot) => shot.timing),
    ...load.userTimings.map((t) => t.startTime + (t.duration ?? 0)),
    ...events.map((e) => e.endMs ?? e.timeMs),
    1,
  );
}
