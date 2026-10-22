"use server";
import * as Sentry from "@sentry/nextjs";
import { PageSpeedInsights } from "@/lib/schema";
import { fetchWorkerStartMeasurement } from "@/lib/page-speed-insights/pageSpeedWorkerClient";

export const requestPageSpeedData = async (testURL: string | undefined): Promise<string | null> => {
  try {
    if (!testURL) {
      return null;
    }
    const result = await startPageSpeedMeasurement(testURL);
    if (typeof result.publicId === "string") {
      return result.publicId;
    }
    return null;
  } catch (error) {
    Sentry.captureException(error);
    return null;
  }
};

type WorkerStartResponse = {
  publicId: string;
  url: string;
  status: "pending" | "completed" | "error";
  data: [PageSpeedInsights | null | undefined][] | Record<string, unknown>;
};

async function startPageSpeedMeasurement(url: string): Promise<WorkerStartResponse> {
  const response = await fetchWorkerStartMeasurement(url, process.env.WORKER_API_KEY ?? "");
  if (!response.ok) {
    throw new Error(`Failed to fetch: ${response.status}`);
  }
  return (await response.json()) as WorkerStartResponse;
}
