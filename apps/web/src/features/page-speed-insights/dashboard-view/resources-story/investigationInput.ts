import type { JSMetrics } from "@/features/page-speed-insights/javascript-metrics/extractJSMetrics";
import { extractJSMetrics } from "@/features/page-speed-insights/javascript-metrics/extractJSMetrics";
import { collectResourceSummaries } from "@/features/page-speed-insights/network-metrics/resourceSummary";
import { entryAuditItems, finiteOrZero } from "@/features/page-speed-insights/shared/auditItems";
import type { InsightsContextItem } from "@/lib/page-speed-insights/types";
import type { TableItem } from "@/lib/schema";
import { getNumber, getUrlString } from "@/lib/utils";
import type { InvestigationScript, ResourcesInvestigationInput } from "./investigationTypes";

// Same schemes as Lighthouse UrlUtils.NON_NETWORK_SCHEMES; resource-summary skips these requests.
const NON_NETWORK_SCHEMES = ["blob", "data", "intent", "file", "filesystem", "chrome-extension"];

function isNonNetworkRequest(item: TableItem): boolean {
  const scheme = (value: unknown) => (typeof value === "string" ? value.split(":")[0] : "");
  return (
    NON_NETWORK_SCHEMES.includes(scheme(item.protocol)) ||
    NON_NETWORK_SCHEMES.includes(scheme(item.url))
  );
}

function sumFinite(items: TableItem[], read: (item: TableItem) => unknown): number | null {
  let saw = false;
  let sum = 0;
  for (const item of items) {
    const value = read(item);
    if (typeof value !== "number" || !Number.isFinite(value)) continue;
    saw = true;
    sum += value;
  }
  return saw ? sum : null;
}

function finiteOrUndefined(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function scriptTransferBytes(metric: JSMetrics): number | null {
  const resources = metric.jsResources.filter((item) => !isNonNetworkRequest(item));
  if (!resources.length) return null;
  return resources.reduce((sum, item) => sum + (+(item.transferSize ?? 0) || 0), 0);
}

function longTaskMs(metric: JSMetrics): number | null {
  const totalTaskTime = metric.diagnostics[0]?.totalTaskTime;
  if (typeof totalTaskTime === "number" && Number.isFinite(totalTaskTime)) return totalTaskTime;
  return sumFinite(metric.mainThreadTasks, (item) => item.duration);
}

function scriptsFrom(metric: JSMetrics): InvestigationScript[] {
  const byUrl = new Map<string, InvestigationScript>();
  function slot(url: string): InvestigationScript {
    const existing = byUrl.get(url);
    if (existing) return existing;
    const created = { url, transferSize: 0, unusedBytes: 0, bootupMs: 0 };
    byUrl.set(url, created);
    return created;
  }

  for (const resource of metric.jsResources) {
    const url = getUrlString(resource.url);
    if (!url) continue;
    slot(url).transferSize += finiteOrZero(getNumber(resource.transferSize));
  }
  for (const item of metric.unusedJS) {
    const url = getUrlString(item.url);
    if (!url) continue;
    const wasted = getNumber(item.wastedBytes);
    const unused = getNumber(item.unusedBytes);
    slot(url).unusedBytes += wasted ?? unused ?? 0;
  }
  for (const item of metric.bootupTime) {
    const url = getUrlString(item.url);
    if (!url) continue;
    const parse = finiteOrZero(getNumber(item.scriptParseCompile));
    const scripting = finiteOrZero(getNumber(item.scripting));
    slot(url).bootupMs += getNumber(item.total) ?? parse + scripting;
  }
  return [...byUrl.values()];
}

function partyNames(entry: InsightsContextItem): { first: Set<string>; third: Set<string> } {
  const first = new Set<string>();
  const third = new Set<string>();
  for (const entity of entry.item.lighthouseResult?.entities ?? []) {
    if (!entity?.name) continue;
    if (entity.isFirstParty) first.add(entity.name);
    else third.add(entity.name);
  }
  return { first, third };
}

function loadTimeFrom(entry: InsightsContextItem): number | null {
  const audit = entry.item.lighthouseResult?.audits?.metrics as
    | { details?: { items?: Array<Record<string, unknown>> } }
    | undefined;
  const value = audit?.details?.items?.[0]?.observedLoad;
  return typeof value === "number" && Number.isFinite(value) && value > 0 ? value : null;
}

export function inputFromEntry(entry: InsightsContextItem): ResourcesInvestigationInput {
  const tiles = collectResourceSummaries([entry])[0]?.tiles;
  const total = tiles?.find((tile) => tile.resourceType === "total");
  const thirdParty = tiles?.find((tile) => tile.resourceType === "third-party");
  const metric = extractJSMetrics(entry);
  const parties = partyNames(entry);

  const requests = entryAuditItems(entry, "network-requests").flatMap((item) => {
    const url = getUrlString(item.url);
    const transferSize = finiteOrZero(getNumber(item.transferSize));
    if (!url || transferSize <= 0) return [];
    const entity = typeof item.entity === "string" ? item.entity : undefined;
    const resourceType = typeof item.resourceType === "string" ? item.resourceType : "Other";
    return [
      {
        url,
        resourceType,
        transferSize,
        thirdParty: entity ? parties.third.has(entity) : false,
        ...(entity ? { entity } : {}),
      },
    ];
  });

  return {
    label: entry.label,
    totalBytes: total?.transferSize ?? null,
    requestCount: total?.requestCount ?? null,
    thirdPartyBytes: thirdParty?.transferSize ?? null,
    scriptBytes: scriptTransferBytes(metric),
    unusedBytes: sumFinite(
      metric.unusedJS,
      (item) => finiteOrUndefined(item.wastedBytes) ?? item.unusedBytes,
    ),
    mainThreadMs: sumFinite(metric.mainThreadWork, (item) => item.duration),
    longTaskMs: longTaskMs(metric),
    loadTimeMs: loadTimeFrom(entry),
    requests,
    scripts: scriptsFrom(metric),
  };
}
