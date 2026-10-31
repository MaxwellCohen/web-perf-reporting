import type { AuditDetailFilmstrip } from "@/lib/schema";
import type { MetricAuditSource } from "@/features/page-speed-insights/metricCauseAudits";

export type FcpScreenshot = {
  label: string;
  data: string;
  /** Filmstrip frame time, ms from navigation start. */
  timing: number;
  /** First Contentful Paint, ms from navigation start. */
  fcpMs: number;
};

type FilmstripFrame = Pick<AuditDetailFilmstrip["items"][number], "timing" | "data"> & {
  timestamp?: number;
};

function filmstripItems(details: unknown): FilmstripFrame[] | undefined {
  if (!details || typeof details !== "object") return undefined;
  if ((details as { type?: unknown }).type !== "filmstrip") return undefined;

  const items = (details as { items?: unknown }).items;
  if (!Array.isArray(items)) return undefined;

  return items.filter(
    (item): item is FilmstripFrame =>
      !!item &&
      typeof item === "object" &&
      typeof (item as FilmstripFrame).data === "string" &&
      Number.isFinite((item as FilmstripFrame).timing),
  );
}

/**
 * Filmstrip frames are sparse, so a frame rarely lands exactly on FCP. The
 * first frame at or after FCP is the page as it looked once first content had
 * painted.
 */
function frameAtFcp(items: FilmstripFrame[], timeMs: number): FilmstripFrame | undefined {
  const frames = items.filter((item) => item.data && Number.isFinite(item.timing));

  return frames.find((frame) => frame.timing >= timeMs) ?? frames[frames.length - 1];
}

export function collectFcpScreenshots(sources: MetricAuditSource[]): FcpScreenshot[] {
  const screenshots: FcpScreenshot[] = [];

  for (const { audits, label } of sources) {
    const fcpMs = audits["first-contentful-paint"]?.numericValue;
    if (fcpMs == null || !Number.isFinite(fcpMs)) continue;

    const items = filmstripItems(audits["screenshot-thumbnails"]?.details);
    if (!items?.length) continue;

    const frame = frameAtFcp(items, fcpMs);
    if (!frame) continue;

    screenshots.push({ label, data: frame.data, timing: frame.timing, fcpMs });
  }

  return screenshots;
}
