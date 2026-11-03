import type { AuditResultsRecord, TableItem } from "@/lib/schema";
import { getNumber } from "@/lib/utils";
import type { RenderBlockingStatus } from "./types";
import type { RawNetworkRequest, RenderBlockingItem } from "./timelineSourceTypes";
import { auditItems } from "./auditReaders";

function normalizeRenderBlocking(value: string | undefined): RenderBlockingStatus | undefined {
  if (!value) return undefined;
  const normalized = value.toLowerCase().replace(/_/g, "-");
  if (normalized === "blocking") return "blocking";
  if (normalized === "non-blocking" || normalized === "dynamically-injected-non-blocking") {
    return "non-blocking";
  }
  if (normalized === "potentially-blocking" || normalized === "in-body-parser-blocking") {
    return "potentially-blocking";
  }
  return undefined;
}

export function downloadBlockingStatus(
  request: RawNetworkRequest,
  blockingUrlSet: Set<string>,
  textBlockingUrlSet: Set<string>,
): RenderBlockingStatus {
  const recorded = normalizeRenderBlocking(request.renderBlocking);
  if (recorded) return recorded;
  if (blockingUrlSet.has(request.url)) return "blocking";
  if (request.resourceType === "Stylesheet" && !request.isLinkPreload) {
    return "potentially-blocking";
  }
  if (request.resourceType === "Font" && textBlockingUrlSet.has(request.url)) {
    return "potentially-blocking";
  }
  return "non-blocking";
}

export function textBlockingUrls(audits: AuditResultsRecord | undefined): Set<string> {
  return new Set(
    auditItems(audits, "font-display-insight")
      .filter((item): item is TableItem => !!item && typeof item === "object")
      .map((item) => (typeof item.url === "string" ? item.url : ""))
      .filter(Boolean),
  );
}

export function renderBlocking(audits: AuditResultsRecord | undefined): RenderBlockingItem[] {
  return auditItems(audits, "render-blocking-insight")
    .filter((item): item is TableItem => !!item && typeof item === "object")
    .map((item) => ({
      url: typeof item.url === "string" ? item.url : "",
      wastedMs: getNumber(item.wastedMs),
      totalBytes: getNumber(item.totalBytes),
    }))
    .filter((item) => item.url);
}
