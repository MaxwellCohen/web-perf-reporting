import {
  resolveWorkerEnvelope,
  type ResolvedWorkerEnvelope,
  type WorkerJobEnvelope,
} from "@/lib/page-speed-insights/resolveWorkerEnvelope";

const NOT_READY_MESSAGE = "Data is not yet ready no data!!";

/** Maps a resolved worker envelope to an HTTP response for GET `/api/pagespeed/:publicId`. */
export function workerEnvelopeToHttpResponse(resolved: ResolvedWorkerEnvelope): Response {
  switch (resolved.kind) {
    case "missing":
      return new Response(NOT_READY_MESSAGE, { status: 404 });
    case "pending":
      return new Response(JSON.stringify(resolved.envelope), { status: 404 });
    case "failed":
      return new Response(
        JSON.stringify({
          status: "failed",
          error: resolved.error,
          ...(resolved.url ? { url: resolved.url } : {}),
        }),
        { status: 500, headers: { "Content-Type": "application/json" } },
      );
    case "ready":
      return new Response(resolved.body, {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    case "ready_envelope":
      return new Response(JSON.stringify(resolved.envelope), { status: 200 });
  }
}

export function getWorkerEnvelopeToResponse(data: WorkerJobEnvelope | null): Response {
  return workerEnvelopeToHttpResponse(resolveWorkerEnvelope(data));
}
