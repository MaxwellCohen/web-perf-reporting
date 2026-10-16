export type Rating = "good" | "needs-improvement" | "poor";
export type MarkerKind = "blocking" | "cwv" | "marker" | "fact";
export type StepStatus = "measured" | "inferred" | "not-recorded";

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
};

export type TimelineStep = {
  id: string;
  title: string;
  status: StepStatus;
  kind: MarkerKind;
  /** ms from navigation start when known */
  timeMs?: number;
  /** end of a span, ms from navigation start */
  endMs?: number;
  detail: string;
  rating?: Rating;
  evidence?: string[];
  table?: TimelineTable;
  waterfall?: TimelineWaterfallBar[];
};

export type TimelinePhase = {
  id: PhaseId;
  title: string;
  startMs: number;
  endMs: number;
  steps: TimelineStep[];
};

export type ScreenshotFrame = {
  timing: number;
  data: string;
};

export type Milestone = {
  id: string;
  label: string;
  timeMs: number;
  kind: MarkerKind;
  rating?: Rating;
  phaseId: PhaseId;
};

export type NetworkBar = {
  id: string;
  url: string;
  resourceType: string;
  startMs: number;
  endMs: number;
  transferSize?: number;
  statusCode?: number;
  protocol?: string;
  isLinkPreload?: boolean;
  isRenderBlocking?: boolean;
  isCriticalChain?: boolean;
  entity?: string;
};

export type MainThreadBlock = {
  id: string;
  startMs: number;
  durationMs: number;
  url?: string;
};

export type LcpSegment = {
  subpart: string;
  label: string;
  durationMs: number;
  startMs: number;
  endMs: number;
};

export type FindingSeverity = "critical" | "high" | "medium" | "low";

export type TimelineFinding = {
  id: string;
  title: string;
  severity: FindingSeverity;
  startMs: number;
  endMs: number;
  summary: string;
  fix: string;
  stepIds: string[];
  evidence: string[];
};

/** One combined row in the vertical scroll timeline (0ms at top → later down). */
export type TimelineMoment = {
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
  screenshot?: ScreenshotFrame;
  network: NetworkBar[];
  mainThread: MainThreadBlock[];
  findings: TimelineFinding[];
  lcpSegments?: LcpSegment[];
  isPhaseStart?: boolean;
};

export type PageLoadTimeline = {
  label: string;
  phases: TimelinePhase[];
  /** Chronological rows for the vertical scroll UI (0ms first). */
  moments: TimelineMoment[];
  screenshots: ScreenshotFrame[];
  milestones: Milestone[];
  networkBars: NetworkBar[];
  mainThreadBlocks: MainThreadBlock[];
  lcpSegments: LcpSegment[];
  lcpElementLabel?: string;
  findings: TimelineFinding[];
  /** Scale for inline network and main-thread bars, through the end of the trace. */
  axisEndMs: number;
  /** Set when times were moved onto Lighthouse's simulated CPU and network. */
  simulationLabel?: string;
};
