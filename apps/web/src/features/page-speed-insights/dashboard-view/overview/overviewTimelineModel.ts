import type { CombinedLoad } from "@/features/page-speed-insights/page-load-timeline/collectTimelineSources";
import type {
  Rating,
  ScreenshotFrame,
} from "@/features/page-speed-insights/page-load-timeline/types";
import { formatMs } from "@/features/page-speed-insights/shared/format";

type LaneId = "document" | "render-blocking" | "lcp" | "main-thread" | "layout-shifts";

export type LaneSegment = {
  key: string;
  startMs: number;
  endMs: number;
  /** Short text drawn on the bar; empty for bars too small to label. */
  label: string;
  /** Full description for the tooltip and accessible name. */
  description: string;
  /** Cause card this bar opens. Missing when the report has no matching audit. */
  causeId?: string;
  /** LCP subpart id, which picks the bar colour on the LCP lane. */
  subpart?: string;
};

export type Lane = {
  id: LaneId;
  name: string;
  segments: LaneSegment[];
};

type TimelineMark = {
  id: "fcp" | "lcp";
  label: string;
  timeMs: number;
  rating?: Rating;
};

export type OverviewTimeline = {
  /** Right edge of the time axis. */
  endMs: number;
  /** Axis labels, starting at 0 and stopping before `endMs`. */
  ticks: number[];
  marks: TimelineMark[];
  lanes: Lane[];
  /** One screenshot per equal slice of the axis: what was on screen when the slice ended. */
  frames: Array<{ timeMs: number; frame: ScreenshotFrame | null }>;
};

const FRAME_SLOTS = 10;
const TICK_COUNT = 5;
const NICE_STEPS = [1, 2, 2.5, 5, 10];

/** Audits a lane's bars can open, in order of preference. */
const LANE_CAUSES: Record<Exclude<LaneId, "lcp">, string[]> = {
  document: ["document-latency-insight"],
  "render-blocking": ["render-blocking-insight"],
  "main-thread": ["bootup-time", "main-thread-tasks", "mainthread-work-breakdown"],
  "layout-shifts": ["cls-culprits-insight", "layout-shifts"],
};

const LCP_SUBPART_CAUSES: Record<string, string[]> = {
  timeToFirstByte: ["document-latency-insight", "lcp-breakdown-insight"],
  resourceLoadDelay: ["lcp-discovery-insight", "lcp-breakdown-insight"],
  resourceLoadDuration: ["image-delivery-insight", "lcp-breakdown-insight"],
  elementRenderDelay: ["lcp-breakdown-insight"],
};

function finite(value: number | undefined): value is number {
  return value != null && Number.isFinite(value);
}

function fileName(url: string | undefined): string {
  if (!url) return "";
  try {
    const { pathname, host } = new URL(url);
    return pathname.split("/").filter(Boolean).pop() ?? host;
  } catch {
    return url;
  }
}

function span(startMs: number, endMs: number): string {
  return `${formatMs(startMs)} to ${formatMs(endMs)}`;
}

/** Smallest "round" axis step that covers `maxMs` in TICK_COUNT steps. */
function axisStep(maxMs: number): number {
  const raw = Math.max(maxMs, 1) / TICK_COUNT;
  const magnitude = 10 ** Math.floor(Math.log10(raw));
  const nice = NICE_STEPS.find((step) => step * magnitude >= raw) ?? 10;
  return nice * magnitude;
}

function documentSegments(load: CombinedLoad): Omit<LaneSegment, "causeId">[] {
  const segments: Omit<LaneSegment, "causeId">[] = [];
  const redirectMs = finite(load.redirectAuditMs) ? load.redirectAuditMs : 0;
  if (redirectMs > 0) {
    segments.push({
      key: "redirect",
      startMs: 0,
      endMs: redirectMs,
      label: "Redirect",
      description: `Redirect, ${span(0, redirectMs)}`,
    });
  }
  const serverStart = finite(load.serverStartMs) ? load.serverStartMs : redirectMs;
  const serverEnd = finite(load.serverEndMs) ? load.serverEndMs : load.ttfb;
  if (finite(serverEnd) && serverEnd > serverStart) {
    segments.push({
      key: "server",
      startMs: serverStart,
      endMs: serverEnd,
      label: "Server",
      description: `Server response, ${span(serverStart, serverEnd)}`,
    });
  }
  return segments;
}

function renderBlockingSegments(load: CombinedLoad): Omit<LaneSegment, "causeId">[] {
  const blocking = load.requests.filter((request) => request.renderBlocking === "blocking");
  if (!blocking.length) return [];
  const startMs = Math.min(...blocking.map((request) => request.networkRequestTime));
  const endMs = Math.max(...blocking.map((request) => request.networkEndTime));
  if (!(endMs > startMs)) return [];
  const names = blocking.map((request) => fileName(request.url)).filter(Boolean);
  const label =
    blocking.length === 1 ? names[0] || "1 request" : `${blocking.length} blocking requests`;
  return [
    {
      key: "render-blocking",
      startMs,
      endMs,
      label,
      description: `${names.join(", ") || label}, ${span(startMs, endMs)}`,
    },
  ];
}

function mainThreadSegments(load: CombinedLoad): Omit<LaneSegment, "causeId">[] {
  return load.longTasks
    .filter((task) => finite(task.startTime) && task.duration > 0)
    .map((task, index) => {
      const endMs = task.startTime + task.duration;
      const name = fileName(task.url) || "Long task";
      return {
        key: `task-${index}`,
        startMs: task.startTime,
        endMs,
        label: name,
        description: `${name}, ${formatMs(task.duration)} task, ${span(task.startTime, endMs)}`,
      };
    });
}

function layoutShiftSegments(load: CombinedLoad): Omit<LaneSegment, "causeId">[] {
  return load.layoutShifts
    .filter((shift) => finite(shift.startTime))
    .map((shift, index) => ({
      key: `shift-${index}`,
      startMs: shift.startTime,
      endMs: shift.startTime,
      label: "",
      description: `Layout shift of ${shift.score.toFixed(3)}${
        shift.nodeLabel ? ` on ${shift.nodeLabel}` : ""
      } at ${formatMs(shift.startTime)}`,
    }));
}

function pickCause(candidates: string[], causeIds: ReadonlySet<string>): string | undefined {
  return candidates.find((id) => causeIds.has(id));
}

/**
 * Lanes of the load, each bar tied to the cause card that explains it.
 * `causeIds` are the audits the Overview shows; a bar without one is not clickable.
 */
export function buildOverviewTimeline(
  load: CombinedLoad,
  causeIds: ReadonlySet<string>,
): OverviewTimeline | null {
  const withCause =
    (id: Exclude<LaneId, "lcp">) =>
    (segment: Omit<LaneSegment, "causeId">): LaneSegment => ({
      ...segment,
      causeId: pickCause(LANE_CAUSES[id], causeIds),
    });

  const lanes: Lane[] = [
    {
      id: "document" as const,
      name: "Document",
      segments: documentSegments(load).map(withCause("document")),
    },
    {
      id: "render-blocking" as const,
      name: "Render-blocking",
      segments: renderBlockingSegments(load).map(withCause("render-blocking")),
    },
    {
      id: "lcp" as const,
      name: "LCP element",
      segments: load.lcpSegments
        .filter((segment) => segment.endMs > segment.startMs)
        .map((segment) => ({
          key: segment.subpart,
          startMs: segment.startMs,
          endMs: segment.endMs,
          label: segment.label || segment.subpart,
          description: `${segment.label || segment.subpart}, ${formatMs(segment.durationMs)}, ${span(segment.startMs, segment.endMs)}`,
          subpart: segment.subpart,
          causeId: pickCause(
            LCP_SUBPART_CAUSES[segment.subpart] ?? ["lcp-breakdown-insight"],
            causeIds,
          ),
        })),
    },
    {
      id: "main-thread" as const,
      name: "Main thread",
      segments: mainThreadSegments(load).map(withCause("main-thread")),
    },
    {
      id: "layout-shifts" as const,
      name: "Layout shifts",
      segments: layoutShiftSegments(load).map(withCause("layout-shifts")),
    },
  ].filter((lane) => lane.segments.length > 0);

  const marks: TimelineMark[] = [];
  if (finite(load.fcp)) {
    marks.push({ id: "fcp", label: "FCP", timeMs: load.fcp, rating: load.fcpRating });
  }
  if (finite(load.lcp)) {
    marks.push({ id: "lcp", label: "LCP", timeMs: load.lcp, rating: load.lcpRating });
  }

  if (!lanes.length && !marks.length) return null;

  const maxMs = Math.max(
    0,
    ...marks.map((mark) => mark.timeMs),
    ...lanes.flatMap((lane) => lane.segments.map((segment) => segment.endMs)),
  );
  const step = axisStep(maxMs);
  const endMs = step * Math.max(1, Math.ceil(maxMs / step));
  const ticks: number[] = [];
  for (let tick = 0; tick < endMs; tick += step) ticks.push(tick);

  const screenshots = [...load.screenshots]
    .filter((frame) => frame.data.length > 0 && Number.isFinite(frame.timing))
    .sort((a, b) => a.timing - b.timing);
  const frames = screenshots.length
    ? Array.from({ length: FRAME_SLOTS }, (_, index) => {
        const timeMs = ((index + 1) * endMs) / FRAME_SLOTS;
        const frame = screenshots.findLast((shot) => shot.timing <= timeMs) ?? null;
        return { timeMs, frame };
      })
    : [];

  return { endMs, ticks, marks, lanes, frames };
}
