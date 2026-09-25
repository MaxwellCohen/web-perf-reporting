import type { PageSpeedInsightsSnapshot } from "@/features/page-speed-insights/PageSpeedContext";
import { getNumber } from "@/lib/utils";

/** Share of LCP breakdown duration that must be element render delay. */
export const ELEMENT_RENDER_DELAY_SHARE_THRESHOLD = 0.8;

/** Minimum observed LCP − FCP gap (ms) treated as “seconds later”. */
export const LCP_AFTER_FCP_MS_THRESHOLD = 1000;

export type PossibleLcpRemountMatch = {
  label: string;
  elementRenderDelayShare: number;
  observedFcpMs: number;
  observedLcpMs: number;
  lcpAfterFcpMs: number;
};

type BreakdownSubpart = {
  subpart?: string;
  duration?: unknown;
};

function isTextLcp(audits: Record<string, unknown> | undefined): boolean {
  const discovery = audits?.["lcp-discovery-insight"] as
    | { scoreDisplayMode?: string }
    | undefined;
  return discovery?.scoreDisplayMode === "notApplicable";
}

function elementRenderDelayShare(audits: Record<string, unknown> | undefined): number | null {
  const breakdown = audits?.["lcp-breakdown-insight"] as
    | { details?: { items?: Array<{ type?: string; items?: BreakdownSubpart[] }> } }
    | undefined;
  const tableItem = breakdown?.details?.items?.find((item) => item.type === "table");
  const subparts = tableItem?.items ?? [];
  if (!subparts.length) return null;

  let total = 0;
  let renderDelay = 0;
  for (const subpart of subparts) {
    const duration = getNumber(subpart.duration) ?? 0;
    total += duration;
    if (subpart.subpart === "elementRenderDelay") {
      renderDelay += duration;
    }
  }

  if (total <= 0) return null;
  return renderDelay / total;
}

function observedPaintGapMs(audits: Record<string, unknown> | undefined): {
  fcp: number;
  lcp: number;
  gap: number;
} | null {
  const metrics = audits?.["metrics"] as
    | { details?: { items?: Array<Record<string, unknown>> } }
    | undefined;
  const metricItem = metrics?.details?.items?.[0];
  if (!metricItem) return null;

  const fcp = getNumber(metricItem.observedFirstContentfulPaint);
  const lcp = getNumber(metricItem.observedLargestContentfulPaint);
  if (fcp === undefined || lcp === undefined) return null;

  return { fcp, lcp, gap: lcp - fcp };
}

/** Weak PSI proxy for hydration remount delaying LCP; a Chrome trace is required to confirm. */
export function detectPossibleLcpRemount(
  items: PageSpeedInsightsSnapshot["context"]["items"],
): PossibleLcpRemountMatch[] {
  const matches: PossibleLcpRemountMatch[] = [];

  for (const { item, label } of items) {
    const audits = item?.lighthouseResult?.audits as Record<string, unknown> | undefined;
    if (!isTextLcp(audits)) continue;

    const share = elementRenderDelayShare(audits);
    if (share === null || share < ELEMENT_RENDER_DELAY_SHARE_THRESHOLD) continue;

    const paints = observedPaintGapMs(audits);
    if (!paints || paints.gap < LCP_AFTER_FCP_MS_THRESHOLD) continue;

    matches.push({
      label,
      elementRenderDelayShare: share,
      observedFcpMs: paints.fcp,
      observedLcpMs: paints.lcp,
      lcpAfterFcpMs: paints.gap,
    });
  }

  return matches;
}

let lastItemsRef: PageSpeedInsightsSnapshot["context"]["items"] | undefined;
let lastComputed: PossibleLcpRemountMatch[] = [];

export function selectPossibleLcpRemountMatches(
  snapshot: PageSpeedInsightsSnapshot,
): PossibleLcpRemountMatch[] {
  const items = snapshot.context.items;
  if (items === lastItemsRef) return lastComputed;

  lastItemsRef = items;
  lastComputed = detectPossibleLcpRemount(items);
  return lastComputed;
}
