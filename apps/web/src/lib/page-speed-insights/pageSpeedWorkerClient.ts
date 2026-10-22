const DEFAULT_WORKER_ORIGIN = "https://web-perf-report-cf.to-email-max.workers.dev";

function getWorkerPageSpeedOrigin(): string {
  return process.env.WORKER_URL ?? DEFAULT_WORKER_ORIGIN;
}

export async function fetchWorkerJobEnvelopeByPublicId(publicId: string): Promise<Response> {
  const requestUrl = new URL(getWorkerPageSpeedOrigin());
  requestUrl.pathname = "/get-by-id";
  requestUrl.searchParams.append("id", publicId);
  return fetch(requestUrl);
}

/** Starts a worker-side measurement. The Void worker checks x-api-key. The current worker still checks ?key=. */
export async function fetchWorkerStartMeasurement(url: string, apiKey: string): Promise<Response> {
  const origin = getWorkerPageSpeedOrigin();
  const requestUrl = new URL(origin);
  requestUrl.searchParams.append("url", url);
  if (origin === DEFAULT_WORKER_ORIGIN && process.env.PAGESPEED_INSIGHTS_API) {
    requestUrl.searchParams.append("key", process.env.PAGESPEED_INSIGHTS_API);
  }
  return fetch(requestUrl.toString(), {
    headers: apiKey ? { "x-api-key": apiKey } : {},
  });
}
