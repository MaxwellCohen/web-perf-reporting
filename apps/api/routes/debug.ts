import { defineHandler } from "void";
import { isAuthorized } from "../src/auth";
import { asBindings } from "../src/bindings";
import { collectDebugStatus, renderDebugHtml } from "../src/debug";

/** Status page. Browsers pass the key as ?key=; scripts can send x-api-key and get JSON. */
export const GET = defineHandler(async (c) => {
  const env = asBindings(c.env);
  if (!isAuthorized(c.req.header("x-api-key"), c.req.query("key"), env.WORKER_API_KEY)) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const status = await collectDebugStatus(env);
  const wantsHtml = c.req.query("format") !== "json" && (c.req.header("accept") ?? "").includes("text/html");
  c.header("cache-control", "no-store");
  if (!wantsHtml) return c.json(status);

  const jsonUrl = new URL(c.req.url);
  jsonUrl.searchParams.set("format", "json");
  return c.html(renderDebugHtml(status, `${jsonUrl.pathname}${jsonUrl.search}`));
});
