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

/** Starts a worker-side measurement (server actions); includes API key. */
export async function fetchWorkerStartMeasurement(url: string, apiKey: string): Promise<Response> {
  const requestUrl = new URL(getWorkerPageSpeedOrigin());
  requestUrl.searchParams.append("url", url);
  requestUrl.searchParams.append("key", apiKey);
  return fetch(requestUrl.toString());
}
