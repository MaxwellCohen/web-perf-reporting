/**
 * Handler for debug/admin routes
 */

import { listAllRecords } from "../services/storage";

/**
 * Handles the debug list route to view all records
 */
export async function handleDebugList(env: Env): Promise<Response> {
  const records = await listAllRecords(env);
  return new Response(JSON.stringify(records, null, 2), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}
