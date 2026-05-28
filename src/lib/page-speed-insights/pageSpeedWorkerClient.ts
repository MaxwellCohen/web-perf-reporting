const WORKER_PAGE_SPEED_ORIGIN = "https://web-perf-report-cf.to-email-max.workers.dev";

export type WorkerJobEnvelope = { status: string; data?: unknown };

export type CompletedPayloadResult =
  | { ok: true; payload: string }
  | { ok: false; reason: "not_ready" | "failed" | "empty" };

export function getCompletedPayloadFromEnvelope(
  data: WorkerJobEnvelope | null | undefined,
): CompletedPayloadResult {
  if (!data) {
    return { ok: false, reason: "empty" };
  }
  const status = data.status.toLowerCase();
  if (status === "failed") {
    return { ok: false, reason: "failed" };
  }
  if (status !== "completed") {
    return { ok: false, reason: "not_ready" };
  }
  if (typeof data.data === "string" && data.data.length > 0) {
    return { ok: true, payload: data.data };
  }
  return { ok: false, reason: "empty" };
}

export async function fetchWorkerJobEnvelopeByUrl(testURL: string): Promise<Response> {
  const requestUrl = new URL(WORKER_PAGE_SPEED_ORIGIN);
  requestUrl.searchParams.append("url", testURL);
  return fetch(requestUrl);
}

export async function fetchWorkerJobEnvelopeByPublicId(publicId: string): Promise<Response> {
  const requestUrl = new URL(WORKER_PAGE_SPEED_ORIGIN);
  requestUrl.pathname = "/get-by-id";
  requestUrl.searchParams.append("id", publicId);
  console.log(requestUrl.toString());
  return fetch(requestUrl);
}

/** Starts a worker-side measurement (server actions); includes API key like the legacy `savePageSpeedData` flow. */
export async function fetchWorkerStartMeasurement(url: string, apiKey: string): Promise<Response> {
  const requestUrl = new URL(WORKER_PAGE_SPEED_ORIGIN);
  requestUrl.searchParams.append("url", url);
  requestUrl.searchParams.append("key", apiKey);
  return fetch(requestUrl.toString());
}
