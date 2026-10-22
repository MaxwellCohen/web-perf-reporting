import { defineHandler } from "void";
import { isAuthorized } from "../src/auth";
import { asBindings } from "../src/bindings";
import { startPageSpeed } from "../src/pagespeed/jobs";

export const GET = defineHandler(async (c) => {
  const env = asBindings(c.env);
  const url = c.req.query("url");
  if (!url) return c.json({ error: "Missing url parameter" }, 400);
  if (!isAuthorized(c.req.header("x-api-key"), c.req.query("key"), env.WORKER_API_KEY)) {
    return c.json({ error: "Unauthorized" }, 401);
  }
  const record = await startPageSpeed(env, url);
  return record ?? c.json({ error: "Unable to start report" }, 500);
});

export const POST = GET;
