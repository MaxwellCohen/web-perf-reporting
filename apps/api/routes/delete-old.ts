import { defineHandler } from "void";
import { isAuthorized } from "../src/auth";
import { asBindings } from "../src/bindings";
import { deleteOldRecords } from "../src/pagespeed/storage";

export const GET = defineHandler(async (c) => {
  const env = asBindings(c.env);
  if (!isAuthorized(c.req.header("x-api-key"), c.req.query("key"), env.WORKER_API_KEY)) {
    return c.json({ error: "Unauthorized" }, 401);
  }
  const daysParam = c.req.query("days");
  const daysOld = daysParam ? Number(daysParam) : 10;
  if (!Number.isFinite(daysOld) || daysOld < 0) {
    return c.json({ error: "Invalid days parameter. Must be a positive number." }, 400);
  }
  const result = await deleteOldRecords(env, daysOld);
  return { success: true, daysOld, ...result };
});
