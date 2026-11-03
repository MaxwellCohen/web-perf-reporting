import type { PageSpeedInsights } from "@/lib/schema";

type LighthouseOnlyReport = Pick<PageSpeedInsights, "lighthouseResult">;

function hasLighthouseResult(raw: unknown): raw is LighthouseOnlyReport {
  return (
    typeof raw === "object" &&
    raw !== null &&
    "lighthouseResult" in raw &&
    Boolean(raw.lighthouseResult)
  );
}

// JSON input is untrusted; consumers only read `lighthouseResult`, so a
// lighthouse-only payload is accepted as a report (single boundary assertion).
function normalizePageSpeedInsights(raw: unknown): PageSpeedInsights {
  if (hasLighthouseResult(raw)) {
    return { lighthouseResult: raw.lighthouseResult } as PageSpeedInsights;
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
