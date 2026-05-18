import type { PageSpeedInsights } from "@/lib/schema";
import { parsePageSpeedInsightsArrayFromText } from "@/lib/page-speed-insights/parsePageSpeedInsightsResponse";

/** Relative paths for the Next.js `/api/pagespeed` route handlers. */
export const PAGE_SPEED_INSIGHTS_API = {
  postByUrl: "/api/pagespeed",
  getByPublicId: (publicId: string) => `/api/pagespeed/${encodeURIComponent(publicId)}`,
} as const;

/** Result when the saved-report API returns an error envelope instead of PSI rows. */
export type PageSpeedInsightsQueryData =
  | (PageSpeedInsights | null | undefined)[]
  | { status: "failed" };

export async function postPageSpeedInsightsByUrl(
  testURL: string,
  signal?: AbortSignal,
): Promise<(PageSpeedInsights | null | undefined)[]> {
  const res = await fetch(PAGE_SPEED_INSIGHTS_API.postByUrl, {
    mode: "no-cors",
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ testURL }),
    signal,
  });

  if (!res.ok) {
    const message = await res.text();
    throw { status: res.status, message };
  }
  const text = await res.text();
  return parsePageSpeedInsightsArrayFromText(text);
}

export async function getPageSpeedInsightsByPublicId(
  publicId: string,
  signal?: AbortSignal,
): Promise<PageSpeedInsightsQueryData> {
  const res = await fetch(PAGE_SPEED_INSIGHTS_API.getByPublicId(publicId), {
    mode: "no-cors",
    method: "GET",
    headers: { "Content-Type": "application/json" },
    signal,
  });

  if (res.status === 500) {
    return { status: "failed" as const };
  }

  if (!res.ok) {
    const message = await res.text();
    throw { status: res.status, message };
  }

  const text = await res.text();
  return parsePageSpeedInsightsArrayFromText(text);
}
