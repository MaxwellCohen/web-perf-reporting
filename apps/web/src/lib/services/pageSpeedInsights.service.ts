"use server";
import * as Sentry from "@sentry/nextjs";
import { PageSpeedInsightsTable } from "@/db/schema";
import { db } from "@/db";
import { PageSpeedInsights } from "@/lib/schema";
import { fetchWorkerStartMeasurement } from "@/lib/page-speed-insights/pageSpeedWorkerClient";
import { and, eq } from "drizzle-orm";

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

function createRequestDate() {
  const date = new Date(Date.now());
  date.setMinutes(Math.ceil(date.getMinutes() / 15) * 15, 0, 0);
  return date;
}

type WorkerStartResponse = {
  publicId: string;
  url: string;
  status: "pending" | "completed" | "error";
  data: [PageSpeedInsights | null | undefined][] | Record<string, unknown>;
};

async function startPageSpeedMeasurement(url: string): Promise<WorkerStartResponse> {
  const date = createRequestDate();
  try {
    const response = await fetchWorkerStartMeasurement(url, process.env.PAGESPEED_INSIGHTS_API ?? "");
    if (!response.ok) {
      throw new Error(`Failed to fetch: ${response.status}`);
    }
    return (await response.json()) as WorkerStartResponse;
  } catch (error) {
    await handleMeasurementFailure(error, url, date);
    throw error;
  }
}

async function handleMeasurementFailure(error: unknown, url: string, date: Date) {
  Sentry.captureException(error);

  try {
    await db
      .delete(PageSpeedInsightsTable)
      .where(
        and(
          eq(PageSpeedInsightsTable.url, url),
          eq(PageSpeedInsightsTable.status, "PENDING"),
          eq(PageSpeedInsightsTable.date, date),
        ),
      )
      .execute();
  } catch (dbError) {
    Sentry.captureException(dbError);
  }
}
