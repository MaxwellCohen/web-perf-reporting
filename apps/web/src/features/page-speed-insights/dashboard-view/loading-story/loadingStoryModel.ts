import type { CombinedLoad } from "@/features/page-speed-insights/page-load-timeline/collectTimelineSources";
import type { Rating } from "@/features/page-speed-insights/page-load-timeline/types";
import { formatMs } from "@/features/page-speed-insights/shared/format";

export const LOAD_MOMENTS = [
  {
    id: "ttfb",
    label: "First byte",
    short: "TTFB",
    description: "The browser receives the first byte of the document.",
  },
  {
    id: "fcp",
    label: "First content",
    short: "FCP",
    description: "Text, an image, or canvas first appears.",
  },
  {
    id: "lcp",
    label: "Largest paint",
    short: "LCP",
    description: "The largest visible element finishes painting.",
  },
  {
    id: "load",
    label: "Loaded",
    short: "Load",
    description: "The page and its resources finish loading.",
  },
] as const;

export type StoryMomentId = (typeof LOAD_MOMENTS)[number]["id"];

const MOMENT_ORDER: StoryMomentId[] = ["ttfb", "fcp", "lcp", "load"];

const CLOSE_MS = 15;
const CAPTURED_AT_MOMENT_MS = 80;

type StoryFrame = {
  timing: number;
  data: string;
};

type StoryPhase = {
  id: string;
  label: string;
  durationMs: number;
};

type DeviceMoment = {
  id: StoryMomentId;
  timeMs: number;
  rating?: Rating;
};

export type DeviceStory = {
  label: string;
  simulationLabel?: string;
  moments: DeviceMoment[];
  frames: StoryFrame[];
  phases: StoryPhase[];
  lcpElementLabel?: string;
  lcpSnippet?: string;
};

type TimingCell = {
  timeMs?: number;
  rating?: Rating;
};

export type TimingRow = {
  id: string;
  label: string;
  description: string;
  moment: boolean;
  cells: TimingCell[];
};

export type LoadingStory = {
  key: string;
  defaultMomentId: StoryMomentId;
  devices: DeviceStory[];
  rows: TimingRow[];
};

type StorySource = {
  label: string;
  simulationLabel?: string;
  ttfb?: number;
  fcp?: number;
  lcp?: number;
  loadTime?: number;
  firstPaint?: number;
  firstVisual?: number;
  dcl?: number;
  interactive?: number;
  lastVisual?: number;
  ttfbRating?: Rating;
  fcpRating?: Rating;
  lcpRating?: Rating;
  frames: StoryFrame[];
  phases: StoryPhase[];
  lcpElementLabel?: string;
  lcpSnippet?: string;
};

type ExtraField = "firstVisual" | "firstPaint" | "dcl" | "interactive" | "lastVisual";

const EXTRA_ROWS: Array<{
  id: ExtraField;
  label: string;
  description: string;
  field: ExtraField;
}> = [
  {
    id: "firstVisual",
    field: "firstVisual",
    label: "First visual change",
    description: "The first pixels change on screen.",
  },
  {
    id: "firstPaint",
    field: "firstPaint",
    label: "First paint",
    description: "The browser paints any pixels, including a background.",
  },
  {
    id: "dcl",
    field: "dcl",
    label: "DOM content loaded",
    description: "HTML is parsed. Stylesheets, images, and frames may still be loading.",
  },
  {
    id: "interactive",
    field: "interactive",
    label: "Interactive",
    description: "The main thread has been idle enough to handle input.",
  },
  {
    id: "lastVisual",
    field: "lastVisual",
    label: "Last visual change",
    description: "The last time the picture on screen changed during the trace.",
  },
];

function finite(value: number | undefined): number | undefined {
  return value != null && Number.isFinite(value) ? value : undefined;
}

function momentTime(device: DeviceStory, id: StoryMomentId): number | undefined {
  return device.moments.find((moment) => moment.id === id)?.timeMs;
}

function sourceMoment(source: StorySource, id: StoryMomentId): number | undefined {
  if (id === "ttfb") return finite(source.ttfb);
  if (id === "fcp") return finite(source.fcp);
  if (id === "lcp") return finite(source.lcp);
  return finite(source.loadTime);
}

function hasStory(source: StorySource): boolean {
  return (
    MOMENT_ORDER.some((id) => sourceMoment(source, id) != null) ||
    source.frames.length > 0 ||
    source.phases.length > 0
  );
}

function toSource(load: CombinedLoad): StorySource {
  const label = load.lcpElementLabel?.trim() || undefined;
  const snippet = load.lcpElement?.snippet?.trim() || undefined;
  return {
    label: load.label,
    simulationLabel: load.simulationLabel,
    ttfb: finite(load.ttfb),
    fcp: finite(load.fcp),
    lcp: finite(load.lcp),
    loadTime: finite(load.load),
    firstPaint: finite(load.firstPaint),
    firstVisual: finite(load.firstVisual),
    dcl: finite(load.dcl),
    interactive: finite(load.interactive),
    lastVisual: finite(load.lastVisual),
    ttfbRating: load.ttfbRating,
    fcpRating: load.fcpRating,
    lcpRating: load.lcpRating,
    frames: load.screenshots.filter(
      (frame) => frame.data.length > 0 && Number.isFinite(frame.timing),
    ),
    phases: load.lcpSegments
      .filter((segment) => segment.durationMs >= 1 && segment.subpart)
      .map((segment) => ({
        id: segment.subpart,
        label: segment.label || segment.subpart,
        durationMs: segment.durationMs,
      })),
    lcpElementLabel: label && label !== snippet ? label : undefined,
    lcpSnippet: snippet,
  };
}

function toDevice(source: StorySource): DeviceStory {
  const moments: DeviceMoment[] = [];
  const ttfb = finite(source.ttfb);
  const fcp = finite(source.fcp);
  const lcp = finite(source.lcp);
  const loadTime = finite(source.loadTime);
  if (ttfb != null) moments.push({ id: "ttfb", timeMs: ttfb, rating: source.ttfbRating });
  if (fcp != null) moments.push({ id: "fcp", timeMs: fcp, rating: source.fcpRating });
  if (lcp != null) moments.push({ id: "lcp", timeMs: lcp, rating: source.lcpRating });
  if (loadTime != null) moments.push({ id: "load", timeMs: loadTime });

  return {
    label: source.label,
    simulationLabel: source.simulationLabel,
    moments,
    frames: source.frames,
    phases: source.phases,
    lcpElementLabel: source.lcpElementLabel,
    lcpSnippet: source.lcpSnippet,
  };
}

function defaultMomentId(devices: DeviceStory[]): StoryMomentId {
  for (const id of ["lcp", "fcp", "ttfb", "load"] as const) {
    if (devices.some((device) => momentTime(device, id) != null)) return id;
  }
  return "lcp";
}

function near(left: number, right: number): boolean {
  return Math.abs(left - right) <= CLOSE_MS;
}

function redundantAgainst(
  sources: StorySource[],
  field: ExtraField,
  anchors: Array<(source: StorySource) => number | undefined>,
): boolean {
  let compared = false;
  for (const source of sources) {
    const value = finite(source[field]);
    if (value == null) continue;
    const anchorValues = anchors
      .map((anchor) => anchor(source))
      .filter((anchor): anchor is number => anchor != null);
    if (!anchorValues.length) continue;
    compared = true;
    if (!anchorValues.some((anchor) => near(value, anchor))) return false;
  }
  return compared;
}

function rowSortKey(row: TimingRow): number {
  return row.cells.find((cell) => cell.timeMs != null)?.timeMs ?? Number.POSITIVE_INFINITY;
}

function buildRows(sources: StorySource[]): TimingRow[] {
  const rows: Array<TimingRow & { order: number }> = [];

  MOMENT_ORDER.forEach((id, order) => {
    const meta = LOAD_MOMENTS.find((moment) => moment.id === id)!;
    const cells = sources.map((source) => {
      const timeMs = sourceMoment(source, id);
      const rating =
        id === "ttfb" ? source.ttfbRating : id === "fcp" ? source.fcpRating : id === "lcp" ? source.lcpRating : undefined;
      return timeMs == null ? {} : { timeMs, rating };
    });
    if (cells.every((cell) => cell.timeMs == null)) return;
    rows.push({
      id,
      label: meta.label,
      description: meta.description,
      moment: true,
      cells,
      order,
    });
  });

  const dropFirstPaint = redundantAgainst(sources, "firstPaint", [(source) => finite(source.fcp)]);
  const dropFirstVisual = redundantAgainst(sources, "firstVisual", [
    (source) => finite(source.fcp),
    (source) => (dropFirstPaint ? undefined : finite(source.firstPaint)),
  ]);

  EXTRA_ROWS.forEach((extra, index) => {
    if (extra.field === "firstPaint" && dropFirstPaint) return;
    if (extra.field === "firstVisual" && dropFirstVisual) return;
    const cells = sources.map((source) => {
      const timeMs = finite(source[extra.field]);
      return timeMs == null ? {} : { timeMs };
    });
    if (cells.every((cell) => cell.timeMs == null)) return;
    rows.push({
      id: extra.id,
      label: extra.label,
      description: extra.description,
      moment: false,
      cells,
      order: MOMENT_ORDER.length + index,
    });
  });

  return rows
    .sort((a, b) => rowSortKey(a) - rowSortKey(b) || a.order - b.order)
    .map(({ order: _order, ...row }) => row);
}

export function frameIndexAt(frames: Array<{ timing: number }>, timeMs: number): number {
  if (!frames.length) return -1;
  const index = frames.findIndex((frame) => frame.timing >= timeMs);
  return index === -1 ? frames.length - 1 : index;
}

export function stageCaption(input: {
  momentLabel: string;
  momentTime?: number;
  frameTime?: number;
  overridden: boolean;
}): { title: string; detail: string; headlineMs?: number } {
  if (input.overridden && input.frameTime != null) {
    return {
      title: "Selected frame",
      detail: "You picked this capture.",
      headlineMs: input.frameTime,
    };
  }
  if (input.momentTime == null) {
    return {
      title: "Not recorded",
      detail: "This report has no time for this moment.",
    };
  }
  if (input.frameTime == null) {
    return {
      title: input.momentLabel,
      detail: "No screenshot for this moment.",
      headlineMs: input.momentTime,
    };
  }
  const gap = input.frameTime - input.momentTime;
  if (Math.abs(gap) <= CAPTURED_AT_MOMENT_MS) {
    return {
      title: input.momentLabel,
      detail: "Captured at this moment.",
      headlineMs: input.momentTime,
    };
  }
  if (gap > 0) {
    return {
      title: input.momentLabel,
      detail: `First capture at or after this moment (${formatMs(input.momentTime)}).`,
      headlineMs: input.momentTime,
    };
  }
  return {
    title: input.momentLabel,
    detail: `Latest capture before this moment (${formatMs(input.momentTime)}).`,
    headlineMs: input.momentTime,
  };
}

export function loadingStoryFromLoads(loads: CombinedLoad[]): LoadingStory | null {
  const sources = loads.map(toSource).filter(hasStory);
  if (!sources.length) return null;

  const devices = sources.map(toDevice);
  const momentsKey = devices
    .map((device) =>
      `${device.label}:${device.moments.map((moment) => `${moment.id}:${Math.round(moment.timeMs)}`).join(",")}`,
    )
    .join("|");

  return {
    key: momentsKey,
    defaultMomentId: defaultMomentId(devices),
    devices,
    rows: buildRows(sources),
  };
}
