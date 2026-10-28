const DEFAULT_WORKER_ORIGIN = "https://web-perf-report-api.to-email-max.workers.dev";

function getWorkerPageSpeedOrigin(): string {
  return process.env.WORKER_URL ?? DEFAULT_WORKER_ORIGIN;
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
