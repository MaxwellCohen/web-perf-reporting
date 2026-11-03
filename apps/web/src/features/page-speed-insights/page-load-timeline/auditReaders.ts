import type { AuditResultsRecord, TableItem } from "@/lib/schema";
import { getNumber } from "@/lib/utils";
import { isNavigationRedirect } from "./simulatedThrottling";
import type { Rating, ScreenshotFrame } from "./types";
import type { MetricsItem, RawNetworkRequest } from "./timelineSourceTypes";

export function ratingFor(value: number, good: number, poor: number): Rating {
  if (value <= good) return "good";
  if (value <= poor) return "needs-improvement";
  return "poor";
}

export function auditItems(audits: AuditResultsRecord | undefined, id: string): unknown[] {
  const details = audits?.[id]?.details as { items?: unknown } | undefined;
  return Array.isArray(details?.items) ? details.items : [];
}

export function metricsItem(audits: AuditResultsRecord | undefined): MetricsItem | undefined {
  const items = auditItems(audits, "metrics");
  const first = items[0];
  return first && typeof first === "object" ? (first as MetricsItem) : undefined;
}

export function filmstripFrames(audits: AuditResultsRecord | undefined): ScreenshotFrame[] {
  const details = audits?.["screenshot-thumbnails"]?.details as
    | { type?: string; items?: Array<{ timing?: unknown; data?: unknown }> }
    | undefined;
  if (details?.type !== "filmstrip" || !Array.isArray(details.items)) return [];

  return details.items
    .filter(
      (item): item is { timing: number; data: string } =>
        !!item &&
        typeof item.data === "string" &&
        item.data.length > 0 &&
        Number.isFinite(item.timing),
    )
    .map((item) => ({ timing: item.timing, data: item.data }));
}

export function networkRequests(audits: AuditResultsRecord | undefined): RawNetworkRequest[] {
  return auditItems(audits, "network-requests")
    .filter((item): item is TableItem => !!item && typeof item === "object")
    .map((item) => ({
      url: typeof item.url === "string" ? item.url : "",
      resourceType: typeof item.resourceType === "string" ? item.resourceType : undefined,
      networkRequestTime: getNumber(item.networkRequestTime),
      networkEndTime: getNumber(item.networkEndTime),
      rendererStartTime: getNumber(item.rendererStartTime),
      transferSize: getNumber(item.transferSize),
      resourceSize: getNumber(item.resourceSize),
      statusCode: getNumber(item.statusCode),
      protocol: typeof item.protocol === "string" ? item.protocol : undefined,
      mimeType: typeof item.mimeType === "string" ? item.mimeType : undefined,
      isLinkPreload: item.isLinkPreload === true,
      entity: typeof item.entity === "string" ? item.entity : undefined,
      priority: typeof item.priority === "string" ? item.priority : undefined,
      renderBlocking: typeof item.renderBlocking === "string" ? item.renderBlocking : undefined,
    }))
    .filter((item) => item.url);
}

function isDocumentRequest(request: RawNetworkRequest): boolean {
  return request.resourceType === "Document" || !!request.mimeType?.includes("html");
}

export function mainDocument(requests: RawNetworkRequest[]): RawNetworkRequest | undefined {
  return (
    requests.find((r) => isDocumentRequest(r) && !isNavigationRedirect(r.statusCode)) ??
    requests.find((r) => isDocumentRequest(r))
  );
}
