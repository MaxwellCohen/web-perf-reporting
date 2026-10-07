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
 * Filmstrip frames are sparse. The frame nearest FCP is the page as it looked
 * when first content painted. Ties prefer the earlier frame.
 */
export function frameClosestToTime(
  items: FilmstripFrame[],
  timeMs: number,
): FilmstripFrame | undefined {
  let best: FilmstripFrame | undefined;
  let bestDistance = Infinity;

  for (const item of items) {
    if (!item.data) continue;

    const distance = Math.abs(item.timing - timeMs);
    const preferEarlier =
      distance === bestDistance &&
      best !== undefined &&
      item.timing <= timeMs &&
      best.timing > timeMs;

    if (distance < bestDistance || preferEarlier) {
      best = item;
      bestDistance = distance;
    }
  }

  return best;
}

/** How far past FCP we'll look for a filmstrip frame that is no longer blank. */
const BLANK_FRAME_LOOKAHEAD_MS = 1000;

/**
 * Lighthouse often repeats the initial blank screenshot until the next sample.
 * When the frame nearest FCP is still that blank, use the first later frame
 * that shows a change.
 */
export function frameAtFcp(
  items: FilmstripFrame[],
  timeMs: number,
): FilmstripFrame | undefined {
  const frames = items.filter((item) => item.data && Number.isFinite(item.timing));
  const closest = frameClosestToTime(frames, timeMs);
  if (!closest) return undefined;

  const initial = frames[0];
  const initialIsRepeated = frames.filter((frame) => frame.data === initial.data).length > 1;
  if (!initialIsRepeated || closest.data !== initial.data) return closest;

  const firstChange = frames.find((frame) => frame.data !== initial.data);
  if (!firstChange || firstChange.timing - timeMs > BLANK_FRAME_LOOKAHEAD_MS) return closest;

  return firstChange;
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
