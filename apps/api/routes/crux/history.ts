import { defineHandler } from "void";
import { isAuthorized } from "../../src/auth";
import { asBindings } from "../../src/bindings";
import { readCruxJob, startCruxJob } from "../../src/crux/jobs";

export const POST = defineHandler(async (c) => {
  const env = asBindings(c.env);
  if (!isAuthorized(c.req.header("x-api-key"), c.req.query("key"), env.WORKER_API_KEY)) {
    return c.json({ error: "Unauthorized" }, 401);
  }
  const body = (await c.req.json().catch(() => null)) as { url?: string } | null;
  const pageUrl = body?.url?.trim();
  if (!pageUrl) return c.json({ error: "Missing url" }, 400);
  return startCruxJob(env, "history", pageUrl);
});

export const GET = defineHandler(async (c) => {
  const jobId = c.req.query("jobId");
  if (!jobId) return c.json({ error: "Missing jobId" }, 400);
  const job = await readCruxJob(asBindings(c.env), jobId);
  if (!job.pageUrl) return c.json({ error: "Job not found" }, 404);
  return job;
});
