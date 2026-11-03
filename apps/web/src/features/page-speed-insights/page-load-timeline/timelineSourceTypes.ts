import type { NodeValue } from "@/lib/schema";
import type {
  CriticalChainNode,
  ScriptCpu,
} from "@/features/page-speed-insights/shared/scriptResourceFacts";
import type { LcpSegment, Rating, RenderBlockingStatus, ScreenshotFrame } from "./types";

export type MetricsItem = Record<string, unknown>;

export type RawNetworkRequest = {
  url: string;
  resourceType?: string;
  networkRequestTime?: number;
  networkEndTime?: number;
  rendererStartTime?: number;
  transferSize?: number;
  resourceSize?: number;
  statusCode?: number;
  protocol?: string;
  mimeType?: string;
  isLinkPreload?: boolean;
  entity?: string;
  priority?: string;
  renderBlocking?: string;
};

export type RawLongTask = {
  url?: string;
  startTime: number;
  duration: number;
};

export type LcpSubpart = {
  subpart: string;
  label: string;
  duration: number;
};

export type PreconnectCandidate = {
  origin: string;
  wastedMs: number;
};

export type RenderBlockingItem = {
  url: string;
  wastedMs?: number;
  totalBytes?: number;
};

export type UserTiming = {
  name: string;
  timingType: string;
  startTime: number;
  duration?: number;
};

export type LcpDiscoveryCheck = {
  id: string;
  label: string;
  value: boolean;
};

/** One layout shift with a measurable time (PSI often omits startTime). */
export type LayoutShiftEvent = {
  startTime: number;
  score: number;
  nodeLabel?: string;
};

export type CodeCoverage = {
  totalBytes: number;
  wastedBytes: number;
};

export type CombinedRequest = {
  url: string;
  resourceType?: string;
  networkRequestTime: number;
  networkEndTime: number;
  /** When before networkRequestTime, the waterfall shows a queue segment. */
  rendererStartTime?: number;
  transferSize?: number;
  resourceSize?: number;
  statusCode?: number;
  protocol?: string;
  mimeType?: string;
  isLinkPreload?: boolean;
  entity?: string;
  priority?: string;
  renderBlocking: RenderBlockingStatus;
  isCriticalChain: boolean;
  coverage?: CodeCoverage;
  /** bootup-time CPU for this URL, when Lighthouse attributed any. */
  scriptCpu?: ScriptCpu;
  /** Critical-chain timing from network-dependency-tree-insight. */
  chain?: CriticalChainNode;
};

export type CombinedLongTask = {
  url?: string;
  startTime: number;
  duration: number;
  scriptTransferBytes?: number;
  downloadStartMs?: number;
  downloadEndMs?: number;
  coverage?: CodeCoverage;
  scriptCpu?: ScriptCpu;
  chain?: CriticalChainNode;
};

export type CombinedLoad = {
  label: string;
  simulationLabel?: string;
  fcp?: number;
  lcp?: number;
  /** Observed FCP on the lab clock (mapped when simulated throttling applies). */
  observedFcp?: number;
  /** Observed LCP on the lab clock (mapped when simulated throttling applies). */
  observedLcp?: number;
  observedFcpAllFrames?: number;
  observedLcpAllFrames?: number;
  firstPaint?: number;
  firstVisual?: number;
  dcl?: number;
  load?: number;
  lastVisual?: number;
  interactive?: number;
  traceEnd?: number;
  ttfb?: number;
  ttfbObserved: boolean;
  simulatedTtfb?: number;
  serverThinkMs?: number;
  /** Server think window on the timeline clock, when known. */
  serverStartMs?: number;
  serverEndMs?: number;
  ttfbRating?: Rating;
  fcpRating?: Rating;
  lcpRating?: Rating;
  document?: CombinedRequest;
  requests: CombinedRequest[];
  redirectHops: CombinedRequest[];
  redirectAuditMs?: number;
  redirectAuditUrls: string[];
  longestChainMs?: number;
  longTasks: CombinedLongTask[];
  userTimings: UserTiming[];
  screenshots: ScreenshotFrame[];
  lcpElementLabel?: string;
  /** Lighthouse node for the painted LCP element, including `lhId` for the screenshot crop. */
  lcpElement?: NodeValue;
  lcpSegments: LcpSegment[];
  lcpDiscoveryFailures: LcpDiscoveryCheck[];
  layoutShifts: LayoutShiftEvent[];
  preconnectedText?: string;
  preconnectCandidates: PreconnectCandidate[];
};
