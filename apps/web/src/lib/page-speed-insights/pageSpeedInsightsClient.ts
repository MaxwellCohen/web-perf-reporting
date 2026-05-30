import type { PageSpeedInsights } from "@/lib/schema";

export type PageSpeedInsightsArray = (PageSpeedInsights | null | undefined)[];

/** Result of loading a saved report by `publicId` through the Next API route. */
export type PageSpeedLoadResult =
  | { status: "ok"; data: PageSpeedInsightsArray }
  | { status: "failed"; error?: string; url?: string };

const PAGE_SPEED_GET_BY_PUBLIC_ID = (publicId: string) =>
  `/api/pagespeed/${encodeURIComponent(publicId)}`;

function parsePageSpeedInsightsArrayFromText(text: string): PageSpeedInsightsArray | null {
  try {
    const parsed = JSON.parse(text) as unknown;
    if (Array.isArray(parsed)) {
      return parsed as PageSpeedInsightsArray;
    }
  } catch {
    return null;
  }
  return null;
}

export async function getPageSpeedInsightsByPublicId(
  publicId: string,
  signal?: AbortSignal,
): Promise<PageSpeedLoadResult> {
  const res = await fetch(PAGE_SPEED_GET_BY_PUBLIC_ID(publicId), {
    method: "GET",
    headers: { "Content-Type": "application/json" },
    signal,
  });

  if (res.status === 500) {
    const text = await res.text();
    try {
      const body = JSON.parse(text) as { status?: string; error?: string; url?: string };
      if (body.status === "failed") {
        return { status: "failed", error: body.error, url: body.url };
      }
    } catch {
      // Non-JSON 500 body — generic failed status.
    }
    return { status: "failed" };
  }

  if (!res.ok) {
    const message = await res.text();
    throw { status: res.status, message };
  }

  const text = await res.text();
  const data = parsePageSpeedInsightsArrayFromText(text);
  if (data === null) {
    return {
      status: "failed",
      error: "The PageSpeed Insights response could not be parsed.",
    };
  }

  return { status: "ok", data };
}
