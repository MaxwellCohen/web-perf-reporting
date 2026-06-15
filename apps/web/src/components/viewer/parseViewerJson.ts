import { PageSpeedInsights } from "@/lib/schema";

export function normalizePageSpeedInsights(raw: unknown): PageSpeedInsights {
  if ((raw as PageSpeedInsights).lighthouseResult) {
    return { lighthouseResult: (raw as PageSpeedInsights).lighthouseResult } as any;
  }
  return raw as PageSpeedInsights;
}

export function parseViewerJsonEntries(entries: unknown[]): PageSpeedInsights[] {
  return entries.map(normalizePageSpeedInsights);
}

export function parseViewerJsonString(jsonString: string): PageSpeedInsights[] {
  const rawData = JSON.parse(jsonString) as unknown;
  if (Array.isArray(rawData)) {
    return parseViewerJsonEntries(rawData);
  }
  return rawData ? [normalizePageSpeedInsights(rawData)] : [];
}
