import type { WorkerJobEnvelope } from "@/lib/page-speed-insights/pageSpeedWorkerClient";
import {
  getCompletedPayloadFromEnvelope,
  getFailureMessageFromEnvelope,
  getTestUrlFromEnvelope,
} from "@/lib/page-speed-insights/pageSpeedWorkerClient";

/** Maps a parsed worker envelope to the POST `/api/pagespeed` response (same semantics as before refactor). */
export function postWorkerEnvelopeToResponse(data: WorkerJobEnvelope | null): Response {
  if (!data) {
    return new Response("Data is not yet ready no data", { status: 404 });
  }
  const status = data.status.toLowerCase();
  if (status !== "completed") {
    return new Response(`Data is not yet ready! ${data.status}`, { status: 404 });
  }
  const completed = getCompletedPayloadFromEnvelope(data);
  if (completed.ok) {
    return new Response(completed.payload, {
      headers: { "Content-Type": "application/json" },
    });
  }
  if (completed.reason === "empty") {
    return new Response("", { status: 500 });
  }
  return new Response("", { status: 500 });
}

/** Maps a parsed worker envelope to the GET `/api/pagespeed/:publicId` response (same semantics as before refactor). */
export function getWorkerEnvelopeToResponse(data: WorkerJobEnvelope | null): Response {
  if (!data) {
    return new Response("Data is not yet ready no data!!", { status: 404 });
  }
  const status = data.status.toLowerCase();
  if (status === "failed") {
    const url = getTestUrlFromEnvelope(data);
    return new Response(
      JSON.stringify({
        status: "failed",
        error: getFailureMessageFromEnvelope(data),
        ...(url ? { url } : {}),
      }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }
  if (status !== "completed") {
    return new Response(JSON.stringify(data), { status: 404 });
  }
  if (data.data) {
    return new Response(JSON.stringify(data.data), {
      headers: { "Content-Type": "application/json" },
    });
  }
  return new Response(JSON.stringify(data), { status: 200 });
}
