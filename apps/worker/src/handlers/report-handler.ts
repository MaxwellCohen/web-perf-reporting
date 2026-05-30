/**
 * Handler for report-related routes
 *
 * Flow (no Queue, no long waitUntil):
 * - ROOT: Create public ID and return it immediately. Report is not started here.
 * - GET_BY_PUBLIC_ID: First call runs the full report in-request and returns the result.
 */

import { CACHE_DURATION_MS } from "../constants";
import { getRecordByUrl, createPendingRecord, getRecordByPublicId } from "../services/storage";
import { runFullReport } from "../services/report";

/**
 * Handles the root route for creating and retrieving reports.
 * Creates a public ID and returns immediately; the report runs on first GET_BY_PUBLIC_ID.
 */
export async function handleReportRequest(
  request: Request,
  env: Env,
  _ctx: ExecutionContext
): Promise<Response> {
  const url = new URL(request.url);
  const requestUrl = url.searchParams.get("url");

  if (!requestUrl) {
    return new Response("Missing url parameter", { status: 400 });
  }

  // Check for existing data within the cache duration
  const timeThreshold = Date.now() - CACHE_DURATION_MS;
  const existingRecord = await getRecordByUrl(requestUrl, timeThreshold, env);

  // Return existing completed record if available
  if (existingRecord?.status === "completed") {
    return new Response(JSON.stringify(existingRecord), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Return existing pending or processing record (client can poll GET_BY_PUBLIC_ID)
  if (
    existingRecord &&
    (existingRecord.status === "pending" || existingRecord.status === "processing")
  ) {
    return new Response(JSON.stringify(existingRecord), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Verify API key for creating new reports
  const apiKey = url.searchParams.get("key");
  if (apiKey !== env.PAGESPEED_INSIGHTS_API) {
    return new Response("Unauthorized", { status: 401 });
  }

  // Create new pending record and return public ID immediately (no background work)
  console.log("Creating new pending report for", requestUrl);
  const { publicId } = await createPendingRecord(
    {
      requestUrl,
      formFactor: "ALL",
      status: "pending",
      data: {},
    },
    env
  );

  const pendingRecord = await getRecordByPublicId(publicId, env);
  return new Response(JSON.stringify(pendingRecord), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

const STUCK_PROCESSING_THRESHOLD_MS = 3 * 60 * 1000; // 3 minutes

/**
 * Handles requests to get report data by publicId.
 * First call for a pending (or stuck processing) id runs the full report in-request and returns the result.
 */
export async function handleGetByPublicId(
  request: Request,
  env: Env
): Promise<Response> {
  const url = new URL(request.url);
  const publicId = url.searchParams.get("id");

  if (!publicId) {
    return new Response(JSON.stringify({ error: "Missing id parameter" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  let record = await getRecordByPublicId(publicId, env);

  if (!record) {
    return new Response(JSON.stringify({ error: "Record not found" }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }

  const isStuck =
    record.status === "processing" &&
    record.processingStartedAt != null &&
    Date.now() - record.processingStartedAt > STUCK_PROCESSING_THRESHOLD_MS;

  // Run the full report in this request when pending or stuck (avoids waitUntil 30s limit)
  if (record.status === "pending" || isStuck) {
    await runFullReport(record.url, env, record.publicId);
    record = (await getRecordByPublicId(publicId, env)) ?? record;
  }

  return new Response(JSON.stringify(record), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}
