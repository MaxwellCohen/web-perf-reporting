export type Rating = "good" | "needs-improvement" | "poor";
export type MarkerKind = "blocking" | "cwv" | "marker" | "fact";
export type StepStatus = "measured" | "inferred" | "not-recorded";

/** How a download affected rendering. Matches the Network panel's render-blocking column. */
export type RenderBlockingStatus = "blocking" | "potentially-blocking" | "non-blocking";

export type PhaseId =
  | "navigation"
  | "connection"
  | "requestResponse"
  | "parsingHead"
  | "firstRender"
  | "parsingComplete"
  | "subresources"
  | "afterLoad";

export type TimelineTableCell = {
  text: string;
  /** Full URL when the cell is a resource link */
  href?: string;
  align?: "start" | "end";
};

export type TimelineTable = {
  headers: TimelineTableCell[];
  rows: TimelineTableCell[][];
};

/** One bar in a moment's mini waterfall (absolute times from navigation start). */
export type TimelineWaterfallBar = {
  id: string;
  label: string;
  href?: string;
  startMs: number;
  endMs: number;
  resourceType?: string;
  /** Used share of a stylesheet or script, from Lighthouse coverage. */
  coverage?: string;
  /** Transfer size of the script a long task ran, when the download was recorded. */
  scriptSize?: string;
  /** How long that script took to download. */
  downloadDuration?: string;
  /** When that script download started, ms from navigation start. */
  downloadStartMs?: number;
  /** When that script download finished, ms from navigation start. */
  downloadEndMs?: number;
  /** Chrome network priority, when recorded (VeryHigh, High, Medium, Low, VeryLow). */
  priority?: string;
  /** Set on downloaded resources. */
  renderBlocking?: RenderBlockingStatus;
};

/** A measurement that belongs on another row, such as TTFB on the document request. */
export type TimelineNote = {
  id: string;
  title: string;
  detail: string;
  status: StepStatus;
  kind: MarkerKind;
  rating?: Rating;
  timeMs?: number;
  endMs?: number;
};

export type ScreenshotFrame = {
  timing: number;
  data: string;
};

export type LcpSegment = {
  subpart: string;
  label: string;
  durationMs: number;
  startMs: number;
  endMs: number;
};

/** One chronological row in the vertical scroll timeline (0ms at top → later down). */
export type TimelineEvent = {
  id: string;
  phaseId: PhaseId;
  phaseTitle: string;
  /** Sort / display time; not-recorded facts without a time use phase start */
  timeMs: number;
  endMs?: number;
  title: string;
  detail: string;
  status: StepStatus;
  /** True when the step has its own timestamp. A count or fact placed at the phase start does not. */
  hasTimestamp: boolean;
  kind: MarkerKind;
  rating?: Rating;
  evidence: string[];
  table?: TimelineTable;
  waterfall?: TimelineWaterfallBar[];
  notes?: TimelineNote[];
  screenshot?: ScreenshotFrame;
  lcpSegments?: LcpSegment[];
  isPhaseStart?: boolean;
};

export type PageLoadTimeline = {
  label: string;
  /** Chronological rows for the vertical scroll UI (0ms first). */
  events: TimelineEvent[];
  /** Scale for inline network and main-thread bars, through the end of the trace. */
  axisEndMs: number;
  /** Set when times were moved onto Lighthouse's simulated CPU and network. */
  simulationLabel?: string;
};
