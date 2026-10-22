import { defineHandler } from "void";
import { asBindings } from "../src/bindings";
import { ensurePageSpeedQueued } from "../src/pagespeed/jobs";
import { pageSpeedResponse } from "../src/pagespeed/status";

export const GET = defineHandler(async (c) => {
  const env = asBindings(c.env);
  const publicId = c.req.query("id");
  if (!publicId) return c.json({ error: "Missing id parameter" }, 400);

  await ensurePageSpeedQueued(env, publicId);
  const record = await pageSpeedResponse(env, publicId);
  if (!record) return c.json({ error: "Record not found" }, 404);
  return record;
});
