export type WorkerJobEnvelope = { status: string; url?: string; data?: unknown };

export type WorkerJobState = "queued" | "running";

/** Body of GET `/api/pagespeed/:publicId`. */
export type PageSpeedApiBody =
  | { state: "pending"; jobState: WorkerJobState; url?: string }
  | { state: "failed"; error: string; url?: string }
  | { state: "ready"; data?: unknown };

const NOT_FOUND_ERROR = "The PageSpeed Insights report could not be found.";
const FAILED_ERROR = "The PageSpeed Insights report could not be generated.";
const QUEUED_STATUSES = new Set(["pending", "queued"]);

function nonEmptyUrl(data: WorkerJobEnvelope): { url?: string } {
  return typeof data.url === "string" && data.url.length > 0 ? { url: data.url } : {};
}

function failureMessage(payload: unknown): string {
  if (payload && typeof payload === "object" && "error" in payload) {
    const error = (payload as { error: unknown }).error;
    if (typeof error === "string") return error;
  }
  return typeof payload === "string" && payload.length > 0 ? payload : FAILED_ERROR;
}

function parseData(payload: unknown): unknown {
  if (typeof payload !== "string") return payload;
  try {
    return JSON.parse(payload);
  } catch {
    return undefined;
  }
}

/** Maps a worker job envelope to the API body; a missing envelope is an unknown report (404). */
export function toPageSpeedApiResponse(data: WorkerJobEnvelope | null | undefined): Response {
  if (!data) {
    return Response.json({ state: "failed", error: NOT_FOUND_ERROR } satisfies PageSpeedApiBody, {
      status: 404,
    });
  }
  const status = data.status.toLowerCase();
  let body: PageSpeedApiBody;
  if (status === "failed") {
    body = { state: "failed", error: failureMessage(data.data), ...nonEmptyUrl(data) };
  } else if (status !== "completed") {
    body = {
      state: "pending",
      jobState: QUEUED_STATUSES.has(status) ? "queued" : "running",
      ...nonEmptyUrl(data),
    };
  } else {
    body = { state: "ready", data: parseData(data.data) };
  }
  return Response.json(body);
}
