import {
  urlsMatch,
  type CombinedLoad,
  type CombinedRequest,
} from "@/features/page-speed-insights/page-load-timeline/collectTimelineSources";
import { isLongTask } from "@/features/page-speed-insights/page-load-timeline/groupMainThreadTasks";
import type { RenderBlockingStatus } from "@/features/page-speed-insights/page-load-timeline/types";

export type ResourceTableRow = {
  url: string;
  resourceType: string;
  mimeType?: string;
  statusCode?: number;
  protocol?: string;
  entity?: string;
  transferSize?: number;
  resourceSize?: number;
  unusedBytes?: number;
  totalBytes?: number;
  /** Unused coverage as a percent of covered bytes. */
  unusedShare?: number;
  longTaskCount: number;
  longTaskMs?: number;
  scriptCpuMs?: number;
  scriptingMs?: number;
  parseMs?: number;
  networkStartMs: number;
  durationMs?: number;
  priority?: string;
  renderBlocking: RenderBlockingStatus;
  isCriticalChain: boolean;
  isLinkPreload: boolean;
};

function definedPositive(value: number | undefined): number | undefined {
  return value != null && value > 0 ? value : undefined;
}

function requestRow(request: CombinedRequest, load: CombinedLoad): ResourceTableRow {
  const tasks = load.longTasks.filter(
    (task) => isLongTask(task) && task.url != null && urlsMatch(task.url, request.url),
  );
  const longTaskMs = tasks.reduce((sum, task) => sum + task.duration, 0);
  const coverage = request.coverage;
  const unusedShare =
    coverage && coverage.totalBytes > 0
      ? (coverage.wastedBytes / coverage.totalBytes) * 100
      : undefined;
  const end = request.networkEndTime;
  const start = request.networkRequestTime;

  return {
    url: request.url,
    resourceType: request.resourceType ?? "Other",
    mimeType: request.mimeType,
    statusCode: request.statusCode,
    protocol: request.protocol,
    entity: request.entity,
    transferSize: request.transferSize,
    resourceSize: request.resourceSize,
    unusedBytes: coverage?.wastedBytes,
    totalBytes: coverage?.totalBytes,
    unusedShare,
    longTaskCount: tasks.length,
    longTaskMs: definedPositive(longTaskMs),
    scriptCpuMs: request.scriptCpu?.totalMs,
    scriptingMs: request.scriptCpu?.scriptingMs,
    parseMs: request.scriptCpu?.parseMs,
    networkStartMs: start,
    durationMs: Number.isFinite(end) ? end - start : undefined,
    priority: request.priority,
    renderBlocking: request.renderBlocking,
    isCriticalChain: request.isCriticalChain,
    isLinkPreload: request.isLinkPreload ?? false,
  };
}

/** One row per waterfall request, heaviest transfer first. */
export function resourcesTableFromLoad(load: CombinedLoad): ResourceTableRow[] {
  return load.requests
    .map((request) => requestRow(request, load))
    .sort((a, b) => (b.transferSize ?? -1) - (a.transferSize ?? -1) || a.url.localeCompare(b.url));
}
