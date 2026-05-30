import { type NextRequest } from "next/server";
import { fetchWorkerJobEnvelopeByPublicId } from "@/lib/page-speed-insights/pageSpeedWorkerClient";
import type { WorkerJobEnvelope } from "@/lib/page-speed-insights/resolveWorkerEnvelope";
import { getWorkerEnvelopeToResponse } from "@/lib/page-speed-insights/workerPagespeedApiAdapter";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ publicId: string }> },
) {
  try {
    const { publicId } = await params;

    if (!publicId) {
      return new Response("No publicId provided", { status: 400 });
    }

    const req = await fetchWorkerJobEnvelopeByPublicId(publicId);
    if (!req.ok) {
      console.error("Error fetching PageSpeed Insights data:", req.status, await req.text());
      return new Response("Error fetching data", { status: req.status });
    }

    const data = (await req.json()) as WorkerJobEnvelope | null;
    return getWorkerEnvelopeToResponse(data);
  } catch (error) {
    console.error("Error fetching PageSpeed Insights data:", error);
    return new Response("Internal server error", { status: 500 });
  }
}