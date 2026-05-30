/**
 * Report generation and processing logic
 */

import { fetchPageSpeedData } from "./pagespeed-api";
import {
  createPendingRecord,
  updateRecord,
  saveResultsToBucket,
} from "./storage";

/**
 * Runs a full PageSpeed report for both mobile and desktop
 */
export async function runFullReport(
  url: string,
  env: Env,
  publicId?: string
): Promise<boolean> {
  if (!url) {
    console.error("runFullReport: url is required");
    return false;
  }

  let recordPublicId = publicId;

  // Create pending record if no publicId provided
  if (!recordPublicId) {
    console.log("runFullReport: creating new pending record");
    const result = await createPendingRecord(
      {
        requestUrl: url,
        formFactor: "ALL",
        status: "pending",
        data: {},
      },
      env
    );
    recordPublicId = result.publicId;
  }

  console.log("runFullReport: processing report with publicId", recordPublicId);

  try {
    // Update status to processing and set processingStartedAt timestamp
    await updateRecord(
      {
        publicId: recordPublicId,
        status: "processing",
        data: {},
        dataUrl: "",
        processingStartedAt: Date.now(),
      },
      env
    );

    // Fetch PageSpeed data for both form factors in parallel
    console.log("runFullReport: fetching PageSpeed data");
    const [mobileData, desktopData] = await Promise.all([
      fetchPageSpeedData(url, "MOBILE", env.PAGESPEED_INSIGHTS_API ?? ""),
      fetchPageSpeedData(url, "DESKTOP", env.PAGESPEED_INSIGHTS_API ?? ""),
    ]);

    // Check for API errors
    if (mobileData.error || desktopData.error) {
      const errorMessage =
        mobileData.error || desktopData.error || "Unknown error";
      throw new Error(`PageSpeed API error: ${errorMessage}`);
    }

    // Save results to R2 bucket
    console.log("runFullReport: saving results to bucket");
    const dataUrl = await saveResultsToBucket(
      0,
      url,
      [mobileData, desktopData],
      env,
      recordPublicId
    );

    // Update record to completed
    await updateRecord(
      {
        publicId: recordPublicId,
        status: "completed",
        data: [],
        dataUrl,
      },
      env
    );

    console.log("runFullReport: completed successfully for publicId", recordPublicId);
    return true;
  } catch (error) {
    console.error("runFullReport: error occurred", error);
    const errorData =
      error instanceof Error
        ? { error: error.message, stack: error.stack }
        : { error: String(error) };

    // Update record to failed
    await updateRecord(
      {
        publicId: recordPublicId!,
        status: "failed",
        data: errorData,
        dataUrl: "",
      },
      env
    );

    console.log("runFullReport: marked as failed for publicId", recordPublicId);
    return false;
  }
}
