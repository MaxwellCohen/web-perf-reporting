import type { AuditDetailFilmstrip, AuditResultsRecord } from "@/lib/schema";
import type { CombinedLoad } from "@/features/page-speed-insights/page-load-timeline/collectTimelineSources";
import { collectTimelineSources } from "@/features/page-speed-insights/page-load-timeline/collectTimelineSources";
import type { InsightsContextItem } from "@/lib/page-speed-insights/types";

export type FilmstripMarker = {
  label: string;
  timeMs: number;
};

export type FilmstripTimelineView = {
  timeline: AuditDetailFilmstrip;
  markers: FilmstripMarker[];
  device: string;
  simulationLabel?: string;
};

const AUDIT_MARKERS: Array<{ id: string; label: string }> = [
  { id: "server-response-time", label: "TTFB" },
  { id: "first-contentful-paint", label: "FCP" },
  { id: "largest-contentful-paint", label: "LCP" },
  { id: "interactive", label: "TTI" },
];

/**
 * Map each marker to the first filmstrip frame at or after its time.
 * Multiple markers can land on the same frame.
 */
export function labelsByFrameIndex(
  frames: Array<{ timing: number }>,
  markers: FilmstripMarker[],
): string[][] {
  const result = frames.map(() => [] as string[]);
  if (!frames.length) return result;

  for (const marker of markers) {
    if (!Number.isFinite(marker.timeMs)) continue;
    const found = frames.findIndex((frame) => frame.timing >= marker.timeMs);
    const index = found === -1 ? frames.length - 1 : found;
    if (!result[index].includes(marker.label)) {
      result[index].push(marker.label);
    }
  }

  return result;
}

function sortMarkers(markers: FilmstripMarker[]): FilmstripMarker[] {
  return markers.sort((a, b) => a.timeMs - b.timeMs);
}

function markersFromAudits(audits: AuditResultsRecord | undefined): FilmstripMarker[] {
  if (!audits) return [];

  const markers: FilmstripMarker[] = [];
  for (const { id, label } of AUDIT_MARKERS) {
    const timeMs = audits[id]?.numericValue;
    if (timeMs == null || !Number.isFinite(timeMs)) continue;
    markers.push({ label, timeMs });
  }

  return sortMarkers(markers);
}

/** Markers on the same clock as `collectTimelineSources` (simulated when mobile). */
function markersFromLoad(
  load: Pick<CombinedLoad, "ttfb" | "fcp" | "lcp" | "interactive">,
): FilmstripMarker[] {
  const candidates: Array<[string, number | undefined]> = [
    ["TTFB", load.ttfb],
    ["FCP", load.fcp],
    ["LCP", load.lcp],
    ["TTI", load.interactive],
  ];

  return sortMarkers(
    candidates
      .filter((entry): entry is [string, number] => entry[1] != null && Number.isFinite(entry[1]))
      .map(([label, timeMs]) => ({ label, timeMs })),
  );
}

function filmstripFromFrames(
  frames: Array<{ timing: number; data: string }>,
): AuditDetailFilmstrip | null {
  if (!frames.length) return null;
  return {
    type: "filmstrip",
    scale: 1,
    items: frames.map((frame) => {
      const timing = Math.round(frame.timing);
      return { timing, timestamp: timing, data: frame.data };
    }),
  };
}

function rawFilmstrip(audits: AuditResultsRecord | undefined): AuditDetailFilmstrip | null {
  const details = audits?.["screenshot-thumbnails"]?.details as AuditDetailFilmstrip | undefined;
  if (details?.type !== "filmstrip" || !details.items?.length) return null;
  return details;
}

/**
 * Build screenshot timeline + markers on the lab clock.
 * Mobile simulated throttling warps observed filmstrip times onto Slow 4G / CPU
 * slowdown so they line up with FCP / LCP scores.
 */
export function filmstripTimelineFromItem(
  item: InsightsContextItem,
): FilmstripTimelineView | null {
  const load = collectTimelineSources(item);
  if (load?.screenshots.length) {
    const timeline = filmstripFromFrames(load.screenshots);
    if (!timeline) return null;
    return {
      timeline,
      markers: markersFromLoad(load),
      device: item.label,
      simulationLabel: load.simulationLabel,
    };
  }

  const audits = item.item?.lighthouseResult?.audits;
  const timeline = rawFilmstrip(audits);
  if (!timeline) return null;
  return {
    timeline,
    markers: markersFromAudits(audits),
    device: item.label,
  };
}
