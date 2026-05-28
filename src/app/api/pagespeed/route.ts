import { type NextRequest } from "next/server";
import { fetchWorkerJobEnvelopeByUrl } from "@/lib/page-speed-insights/pageSpeedWorkerClient";
import type { WorkerJobEnvelope } from "@/lib/page-speed-insights/pageSpeedWorkerClient";
import { postWorkerEnvelopeToResponse } from "@/lib/page-speed-insights/workerPagespeedApiAdapter";

export async function POST(request: NextRequest) {
  try {
    const { testURL } = await request.json();
    if (!testURL) {
      return new Response("No testURL provided", { status: 400 });
    }
    let url: URL;
    try {
      url = new URL(testURL);
    } catch {
      return new Response("Invalid URL provided", { status: 400 });
    }
    if (!url.origin) {
      return new Response("Invalid URL provided", { status: 400 });
    }

    const req = await fetchWorkerJobEnvelopeByUrl(testURL);
    if (!req.ok) {
      console.error(req.status, await req.text());
      return new Response("Error fetching data", { status: req.status });
    }
    const data = (await req.json()) as WorkerJobEnvelope | null;
    return postWorkerEnvelopeToResponse(data);
  } catch (error) {
    console.error("Error fetching PageSpeed Insights data:", error);
    return new Response("Internal server error", { status: 500 });
  }
}
