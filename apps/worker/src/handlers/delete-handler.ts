/**
 * Handler for deleting old records
 */

import { deleteOldRecordsFromStorage } from "../services/storage";

/**
 * Handles the delete old records route
 */
export async function handleDeleteOldRecords(
  request: Request,
  env: Env
): Promise<Response> {
  const url = new URL(request.url);
  const daysParam = url.searchParams.get("days");
  const daysOld = daysParam ? +(daysParam) : 10;

  if (isNaN(daysOld) || daysOld < 0) {
    return new Response(
      JSON.stringify({ error: "Invalid days parameter. Must be a positive number." }),
      {
        status: 400,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  try {
    const result = await deleteOldRecordsFromStorage(daysOld, env);
    return new Response(JSON.stringify(result), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}
