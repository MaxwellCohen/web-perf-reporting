import type { PageSpeedInsights } from "@/lib/schema";
import {
  toWorkerJobState,
  type WorkerJobState,
} from "@/lib/page-speed-insights/resolveWorkerEnvelope";

type PageSpeedInsightsArray = (PageSpeedInsights | null | undefined)[];

/**
 * - `timeout` / `error`: transient; Retry re-fetches the same report.
 * - `job`: the worker job failed; "Run again" restarts it for the same URL.
 * - `not_found`: the report does not exist.
 */
export type PageSpeedFailureReason = "timeout" | "error" | "job" | "not_found";

/** Result of loading a saved report by `publicId` through the Next API route. */
export type PageSpeedLoadResult =
  | { status: "ok"; data: PageSpeedInsightsArray }
  | { status: "failed"; error?: string; url?: string; reason?: PageSpeedFailureReason };

type PendingResult = { status: "pending"; state: WorkerJobState; url?: string };

export type PageSpeedRunProgress = {
  state: WorkerJobState;
  url?: string;
  /** Number of polls so far. */
  polls: number;
};

const progressByPublicId = new Map<string, PageSpeedRunProgress>();
const progressListeners = new Set<() => void>();

function setProgress(publicId: string, progress: PageSpeedRunProgress | undefined) {
  if (progress) progressByPublicId.set(publicId, progress);
  else progressByPublicId.delete(publicId);
  progressListeners.forEach((listener) => listener());
}

export function subscribePageSpeedProgress(listener: () => void) {
  progressListeners.add(listener);
  return () => {
    progressListeners.delete(listener);
  };
}

export function getPageSpeedProgress(publicId: string): PageSpeedRunProgress | undefined {
  return progressByPublicId.get(publicId);
}

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

const PAGE_SPEED_POLL_INTERVAL_MS = 2000;
const PAGE_SPEED_POLL_TIMEOUT_MS = 180_000;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Fraction (0-0.95) of the polling budget used after `polls` polls. */
export function pollProgressFraction(polls: number): number {
  const max = PAGE_SPEED_POLL_TIMEOUT_MS / PAGE_SPEED_POLL_INTERVAL_MS;
  return Math.min(polls / max, 0.95);
}

async function getPageSpeedInsightsByPublicId(publicId: string): Promise<PageSpeedLoadResult> {
  const deadline = Date.now() + PAGE_SPEED_POLL_TIMEOUT_MS;
  let polls = 0;

  try {
    while (Date.now() <= deadline) {
      let result: PageSpeedLoadResult | PendingResult;
      try {
        result = await requestPageSpeedInsights(publicId);
      } catch {
        return {
          status: "failed",
          reason: "error",
          error: "We couldn't reach the PageSpeed Insights service.",
        };
      }
      if (result.status !== "pending") return result;
      polls += 1;
      setProgress(publicId, { state: result.state, url: result.url, polls });
      await sleep(PAGE_SPEED_POLL_INTERVAL_MS);
    }

    return {
      status: "failed",
      reason: "timeout",
      error: "The PageSpeed Insights report is still running. Retry to check again.",
    };
  } finally {
    setProgress(publicId, undefined);
  }
}

async function requestPageSpeedInsights(
  publicId: string,
): Promise<PageSpeedLoadResult | PendingResult> {
  const res = await fetch(PAGE_SPEED_GET_BY_PUBLIC_ID(publicId), {
    method: "GET",
    headers: { "Content-Type": "application/json" },
  });

  if (res.status === 404) {
    const text = await res.text();
    try {
      const body = JSON.parse(text) as { status?: string; url?: string };
      if (body.status === "pending" || body.status === "processing") {
        return { status: "pending", state: toWorkerJobState(body.status), url: body.url };
      }
    } catch {
      // A non-JSON 404 is a missing report.
    }
    return {
      status: "failed",
      reason: "not_found",
      error: "The PageSpeed Insights report could not be found.",
    };
  }

  if (res.status === 500) {
    const text = await res.text();
    try {
      const body = JSON.parse(text) as { status?: string; error?: string; url?: string };
      if (body.status === "failed") {
        return { status: "failed", reason: "job", error: body.error, url: body.url };
      }
    } catch {
      // Non-JSON 500 body — generic failed status.
    }
    return { status: "failed", reason: "error" };
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
      reason: "error",
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
    const promise = getPageSpeedInsightsByPublicId(
      publicId,
    ) as PromiseWithStatus<PageSpeedLoadResult>;
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

/** Drops the cached load so the next fetch re-polls the worker (used by Retry). */
export function resetPageSpeedInsightsByPublicId(publicId: string) {
  cache.delete(publicId);
}
