import type { PageSpeedInsights } from "@/lib/schema";

type PageSpeedInsightsArray = (PageSpeedInsights | null | undefined)[];

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

async function getPageSpeedInsightsByPublicId(publicId: string): Promise<PageSpeedLoadResult> {
  const res = await fetch(PAGE_SPEED_GET_BY_PUBLIC_ID(publicId), {
    method: "GET",
    headers: { "Content-Type": "application/json" },
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

type PendingPromise<T> = Promise<T> & {
  status: "pending";
};

type FulfilledPromise<T> = Promise<T> & {
  status: "fulfilled";
  value: T;
};

type RejectedPromise<T> = Promise<T> & {
  status: "rejected";
  reason: unknown;
};

type PromiseWithStatus<T> = PendingPromise<T> | FulfilledPromise<T> | RejectedPromise<T>;

/** Module-level cache so `use()` reuses the same Promise across re-renders. */
const cache = new Map<string, PromiseWithStatus<PageSpeedLoadResult>>();

export function fetchPageSpeedInsightsByPublicId(
  publicId: string,
): PromiseWithStatus<PageSpeedLoadResult> {
  if (!cache.has(publicId)) {
    const promise = getPageSpeedInsightsByPublicId(publicId) as PromiseWithStatus<PageSpeedLoadResult>;
    promise.status = "pending";
    promise.then(
      (value) => {
        const fulfilled = promise as FulfilledPromise<PageSpeedLoadResult>;
        fulfilled.status = "fulfilled";
        fulfilled.value = value;
      },
      (reason: unknown) => {
        const rejected = promise as RejectedPromise<PageSpeedLoadResult>;
        rejected.status = "rejected";
        rejected.reason = reason;
      },
    );
    cache.set(publicId, promise);
  }
  return cache.get(publicId)!;
}

/** Test helper / refresh: drop a cached Promise so the next fetch starts fresh. */
export function clearPageSpeedInsightsByPublicIdCache(publicId?: string) {
  if (publicId === undefined) {
    cache.clear();
    return;
  }
  cache.delete(publicId);
}
