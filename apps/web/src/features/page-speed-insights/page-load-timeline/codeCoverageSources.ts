import type { AuditResultsRecord, TableItem } from "@/lib/schema";
import { getNumber } from "@/lib/utils";
import type { CodeCoverage } from "./timelineSourceTypes";
import { auditItems } from "./auditReaders";

export function coverageKeys(url: string): string[] {
  const keys = [url];
  try {
    const parsed = new URL(url);
    parsed.hash = "";
    keys.push(parsed.toString());
    parsed.search = "";
    keys.push(parsed.toString());
  } catch {
    return keys;
  }
  return keys;
}

function rememberCoverage(
  map: Map<string, CodeCoverage>,
  url: string,
  coverage: CodeCoverage,
): void {
  for (const key of coverageKeys(url)) map.set(key, coverage);
}

export function coverageFor(map: Map<string, CodeCoverage>, url: string): CodeCoverage | undefined {
  for (const key of coverageKeys(url)) {
    const coverage = map.get(key);
    if (coverage) return coverage;
  }
  return undefined;
}

export function isCodeResource(resourceType: string | undefined): boolean {
  return resourceType === "Script" || resourceType === "Stylesheet";
}

function addOpportunityCoverage(map: Map<string, CodeCoverage>, items: unknown[]): void {
  for (const item of items) {
    if (!item || typeof item !== "object") continue;
    const row = item as TableItem;
    const url = typeof row.url === "string" ? row.url : "";
    if (!url.startsWith("http")) continue;

    const wastedBytes = getNumber(row.wastedBytes);
    const wastedPercent = getNumber(row.wastedPercent);
    let totalBytes = getNumber(row.totalBytes);
    if (totalBytes == null && wastedBytes != null && wastedPercent != null && wastedPercent > 0) {
      totalBytes = wastedBytes / (wastedPercent / 100);
    }
    if (wastedBytes == null || totalBytes == null || totalBytes <= 0) continue;
    rememberCoverage(map, url, { totalBytes, wastedBytes });
  }
}

export function codeCoverageByUrl(
  audits: AuditResultsRecord | undefined,
): Map<string, CodeCoverage> {
  const map = new Map<string, CodeCoverage>();

  const treemap = audits?.["script-treemap-data"]?.details as { nodes?: unknown[] } | undefined;
  for (const node of treemap?.nodes ?? []) {
    if (!node || typeof node !== "object") continue;
    const row = node as { name?: unknown; unusedBytes?: unknown; resourceBytes?: unknown };
    if (typeof row.name !== "string" || !row.name.startsWith("http")) continue;
    const totalBytes = getNumber(row.resourceBytes);
    const wastedBytes = getNumber(row.unusedBytes);
    if (totalBytes == null || wastedBytes == null || totalBytes <= 0) continue;
    rememberCoverage(map, row.name, { totalBytes, wastedBytes });
  }

  addOpportunityCoverage(map, auditItems(audits, "unused-javascript"));
  addOpportunityCoverage(map, auditItems(audits, "unused-css-rules"));
  return map;
}
