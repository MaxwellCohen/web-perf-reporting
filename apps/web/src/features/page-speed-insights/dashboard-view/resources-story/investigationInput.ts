import { javascriptStoryFromMetrics } from "@/features/page-speed-insights/dashboard-view/javascript-story/javascriptStoryModel";
import { networkStoryFromSummaries } from "@/features/page-speed-insights/dashboard-view/network-story/networkStoryModel";
import type { JSMetrics } from "@/features/page-speed-insights/javascript-metrics/extractJSMetrics";
import { selectJavaScriptMetrics } from "@/features/page-speed-insights/javascript-metrics/javascriptMetricsSelectors";
import { collectResourceSummaries } from "@/features/page-speed-insights/network-metrics/resourceSummary";
import type { InsightsContextItem } from "@/lib/page-speed-insights/types";
import type { TableItem } from "@/lib/schema";
import { getNumber, getUrlString } from "@/lib/utils";
import type { InvestigationScript, ResourcesInvestigationInput } from "./investigationTypes";

function finite(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
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
    slot(url).transferSize += finite(getNumber(resource.transferSize));
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
    const parse = finite(getNumber(item.scriptParseCompile));
    const scripting = finite(getNumber(item.scripting));
    slot(url).bootupMs += getNumber(item.total) ?? parse + scripting;
  }
  return [...byUrl.values()];
}

function networkRequestItems(entry: InsightsContextItem): TableItem[] {
  const details = entry.item.lighthouseResult?.audits?.["network-requests"]?.details;
  if (!details || !("items" in details) || !Array.isArray(details.items)) return [];
  return details.items;
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
  const summary = collectResourceSummaries([entry])[0];
  const device = summary ? networkStoryFromSummaries([summary])?.devices[0] : undefined;
  const { jsMetrics, jsStats } = selectJavaScriptMetrics({ context: { items: [entry] } });
  const jsReport = javascriptStoryFromMetrics({ jsMetrics, jsStats })?.reports[0];
  const metric = jsMetrics[0];
  const parties = partyNames(entry);

  const requests = networkRequestItems(entry).flatMap((item) => {
    const url = getUrlString(item.url);
    const transferSize = finite(getNumber(item.transferSize));
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
    totalBytes: device?.totalBytes ?? null,
    requestCount: device?.requestCount ?? null,
    thirdPartyBytes: device?.thirdPartyBytes ?? null,
    scriptBytes: jsReport?.values.transfer ?? null,
    unusedBytes: jsReport?.values.unused ?? null,
    mainThreadMs: jsReport?.values.mainThread ?? null,
    longTaskMs: jsReport?.values.longTasks ?? null,
    loadTimeMs: loadTimeFrom(entry),
    requests,
    scripts: metric ? scriptsFrom(metric) : [],
  };
}
