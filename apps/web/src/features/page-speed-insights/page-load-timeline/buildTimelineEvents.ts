import type {
  CombinedLoad,
  CombinedLongTask,
  CombinedRequest,
  LayoutShiftEvent,
  PreconnectCandidate,
  UserTiming,
} from "./collectTimelineSources";
import { groupDownloads } from "./groupDownloads";
import { groupMainThreadTasks, isLongTask } from "./groupMainThreadTasks";
import {
  formatBytes,
  formatMs,
  formatNetworkPriority,
  formatCoverage,
  coverageLabel,
  shortUrl,
} from "@/features/page-speed-insights/shared/format";
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

type PhaseBound = {
  id: PhaseId;
  title: string;
  startMs: number;
};

function queueWindow(
  rendererStart: number | undefined,
  networkStart: number,
): { queueStartMs?: number; queueEndMs?: number } {
  if (
    rendererStart != null &&
    Number.isFinite(rendererStart) &&
    rendererStart < networkStart
  ) {
    return { queueStartMs: rendererStart, queueEndMs: networkStart };
  }
  return {};
}

function requestWaterfallBar(
  request: CombinedRequest,
  id: string,
  extras: Partial<TimelineWaterfallBar> = {},
): TimelineWaterfallBar {
  return {
    id,
    label: shortUrl(request.url),
    href: request.url,
    startMs: request.networkRequestTime,
    endMs: request.networkEndTime,
    resourceType: request.resourceType,
    scriptCpu: request.scriptCpu,
    chain: request.chain,
    ...queueWindow(request.rendererStartTime, request.networkRequestTime),
    ...extras,
  };
}

function pluralResourceTitle(resourceType: string, count: number): string {
  const downloaded =
    resourceType === "Script" || resourceType === "Stylesheet" ? " downloaded" : "";
  if (count === 1) return `${resourceType}${downloaded}`;
  if (resourceType === "Script") return `${count} Scripts${downloaded}`;
  if (resourceType === "Stylesheet") return `${count} Stylesheets${downloaded}`;
  if (resourceType === "Font") return `${count} Fonts`;
  if (resourceType === "Image") return `${count} Images`;
  if (resourceType === "Document") return `${count} Documents`;
  if (resourceType === "Fetch") return `${count} Fetches`;
  if (resourceType === "XHR") return `${count} XHRs`;
  return `${count} ${resourceType}s`;
}

function criticalChainFlag(longestChainMs: number | undefined): string {
  if (longestChainMs != null && longestChainMs > 0) {
    return `critical chain (${formatMs(longestChainMs)})`;
  }
  return "critical chain";
}

function isScriptRequest(request: CombinedRequest): boolean {
  if (request.resourceType === "Script") return true;
  return !!request.mimeType?.includes("javascript");
}

/** Lighthouse network-dependency-tree advice, shown on critical-chain scripts. */
function criticalChainScriptNote(): TimelineNote {
  return {
    id: "critical-chain-js",
    title: "Avoid chaining critical requests",
    detail:
      "Reduce the length of chains, reduce the download size of resources, or defer the download of unnecessary resources to improve page load.",
    status: "measured",
    kind: "marker",
  };
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
    waterfall: hops.map((hop, index) =>
      requestWaterfallBar(hop, `nav-redirects-${index}`, { resourceType: "Redirect" }),
    ),
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

function serverThinkEvent(load: CombinedLoad, bounds: PhaseBound[]): TimelineEvent | null {
  if (load.serverThinkMs == null || load.serverStartMs == null || load.serverEndMs == null) {
    return null;
  }
  const placement =
    load.serverEndMs !== load.serverStartMs
      ? atIntervalEnd(load.serverStartMs, load.serverEndMs)
      : { timeMs: load.serverStartMs };
  return timedEvent(
    "req-server",
    "Server think time",
    `Root document server response took ${formatMs(load.serverThinkMs)}.`,
    placement.timeMs,
    "requestResponse",
    bounds,
    { ...placement, kind: "marker" },
  );
}

function formatClsScore(score: number): string {
  if (!Number.isFinite(score)) return "—";
  if (score === 0) return "0";
  if (Math.abs(score) < 0.001) return score.toPrecision(2);
  return score.toFixed(3);
}

function networkEvents(load: CombinedLoad, bounds: PhaseBound[]): TimelineEvent[] {
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
            singlePriority ? `priority ${formatNetworkPriority(singlePriority)}` : null,
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

    const groupNotes: TimelineNote[] = [];
    if (anyCritical && group.some(isScriptRequest)) {
      groupNotes.push(criticalChainScriptNote());
    }
    const attachedNotes = groupNotes.length > 0 ? groupNotes : undefined;

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
          waterfall: group.map((r, i) =>
            requestWaterfallBar(r, `net-${index}-${i}`, {
              coverage: coverageLabel(r),
              priority: r.priority,
              renderBlocking: r.renderBlocking,
            }),
          ),
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
              ...(showPriority
                ? [{ text: r.priority ? formatNetworkPriority(r.priority) : "", align: "end" as const }]
                : []),
            ]),
          },
        },
        bounds,
      ),
    );
  });

  return events;
}

function longTaskBar(task: CombinedLongTask, id: string): TimelineWaterfallBar {
  const bar: TimelineWaterfallBar = {
    id,
    label: task.url ? shortUrl(task.url) : "Unattributed",
    href: task.url,
    startMs: task.startTime,
    endMs: task.startTime + task.duration,
    resourceType: "Task",
    taskKind: isLongTask(task) ? "long" : "short",
  };
  if (!task.url) return bar;

  if (task.scriptTransferBytes != null) bar.scriptSize = formatBytes(task.scriptTransferBytes);
  if (task.downloadStartMs != null && task.downloadEndMs != null) {
    bar.downloadStartMs = task.downloadStartMs;
    bar.downloadEndMs = task.downloadEndMs;
    bar.downloadDuration = formatMs(Math.max(0, task.downloadEndMs - task.downloadStartMs));
  }
  if (task.coverage) bar.coverage = formatCoverage(task.coverage);
  if (task.scriptCpu) bar.scriptCpu = task.scriptCpu;
  if (task.chain) bar.chain = task.chain;
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

function layoutShiftEvents(shifts: LayoutShiftEvent[], bounds: PhaseBound[]): TimelineEvent[] {
  return shifts.map((shift, index) => {
    const phase = phaseActiveAt(bounds, shift.startTime);
    const scoreText = formatClsScore(shift.score);
    return event(
      {
        id: `layout-shift-${index}`,
        title: "Layout shift",
        detail: [
          `Layout shift score ${scoreText} at ${formatMs(shift.startTime)}.`,
          shift.nodeLabel ? `Largest impacted element: ${shift.nodeLabel}.` : null,
        ]
          .filter(Boolean)
          .join(" "),
        timeMs: shift.startTime,
        phaseId: phase.id,
        kind: "marker",
        rating: shift.score <= 0.1 ? "good" : shift.score <= 0.25 ? "needs-improvement" : "poor",
        evidence: shift.nodeLabel ? [`Element: ${shift.nodeLabel}`] : [],
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
      "Navigation start",
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

  const serverThink = serverThinkEvent(load, bounds);
  if (serverThink) events.push(serverThink);

  if (load.ttfb != null) {
    events.push(
      timedEvent(
        "req-ttfb",
        "TTFB",
        ttfbStepDetail(
          load.ttfb,
          load.ttfbObserved,
          load.simulatedTtfb,
          load.simulationLabel,
        ),
        load.ttfb,
        "requestResponse",
        bounds,
        { kind: "marker", rating: load.ttfbRating },
      ),
    );
  }

  if (load.firstVisual != null) {
    events.push(
      timedEvent(
        "render-first-visual",
        "First visual change",
        `First visual change at ${formatMs(load.firstVisual)}.`,
        load.firstVisual,
        "firstRender",
        bounds,
      ),
    );
  }

  if (load.firstPaint != null) {
    events.push(
      timedEvent(
        "render-fp",
        "First Paint",
        `First Paint at ${formatMs(load.firstPaint)}.`,
        load.firstPaint,
        "firstRender",
        bounds,
      ),
    );
  }

  if (load.fcp != null) {
    events.push(
      timedEvent(
        "render-fcp",
        "FCP",
        `First Contentful Paint at ${formatMs(load.fcp)}.`,
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
          lcpElement: load.lcpElement,
        },
      ),
    );
  }

  if (load.load != null) {
    events.push(
      timedEvent(
        "sub-load",
        "Window load",
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
    ...layoutShiftEvents(load.layoutShifts, bounds),
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
    ...load.layoutShifts.map((shift) => shift.startTime),
    ...events.map((e) => e.endMs ?? e.timeMs),
    1,
  );
}
