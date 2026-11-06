const DEFAULT_WORKER_ORIGIN = "https://web-perf-report-api.to-email-max.workers.dev";

function getWorkerPageSpeedOrigin(): string {
  const configured = process.env.WORKER_URL;
  if (configured) return configured;
  if (process.env.NODE_ENV !== "production") {
    // Local/preview builds quietly talking to production data is a footgun: say so.
    console.warn("WORKER_URL is not set; falling back to the production worker.");
  }
  return DEFAULT_WORKER_ORIGIN;
}

export async function fetchWorkerJobEnvelopeByPublicId(publicId: string): Promise<Response> {
  const requestUrl = new URL(getWorkerPageSpeedOrigin());
  requestUrl.pathname = "/get-by-id";
  requestUrl.searchParams.append("id", publicId);
  return fetch(requestUrl);
}

/** Starts a worker-side measurement. The API checks x-api-key. */
export async function fetchWorkerStartMeasurement(url: string, apiKey: string): Promise<Response> {
  const requestUrl = new URL(getWorkerPageSpeedOrigin());
  requestUrl.searchParams.append("url", url);
  return fetch(requestUrl.toString(), {
    headers: apiKey ? { "x-api-key": apiKey } : {},
  });
}
