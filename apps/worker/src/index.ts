/**
 * Main entry point for the Cloudflare Worker
 * Routes requests to appropriate handlers
 */

import { handleReportRequest, handleGetByPublicId } from "./handlers/report-handler";
import { handleDebugList } from "./handlers/debug-handler";
import { handleDeleteOldRecords } from "./handlers/delete-handler";
import { WORKER_ROUTES } from "./constants";
import openapiSpec from "../openapi.json";

const DOCS_HTML = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Web Performance Report API - Docs</title>
    <script src="https://cdn.jsdelivr.net/npm/@scalar/api-reference@1.25.75/dist/bundle.min.js" defer></script>
  </head>
  <body>
    <div id="api-reference"></div>
    <script>
      window.addEventListener('load', function() {
        ApiReference.render({
          spec: { data: ${JSON.stringify(openapiSpec)} },
          el: document.getElementById('api-reference'),
          configuration: { theme: 'deepSea' }
        });
      });
    </script>
    <style>
      body { margin: 0; }
    </style>
  </body>
</html>`;

const DOCS_ROUTE = "/docs";
const OPENAPI_ROUTE = "/openapi.json";

export { DOCS_ROUTE, OPENAPI_ROUTE };

// Re-export types for external use
export type { PageSpeedRecord } from "./types";

export default {
  async fetch(
    request: Request,
    env: Env,
    ctx: ExecutionContext
  ): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === DOCS_ROUTE) {
      return new Response(DOCS_HTML, {
        headers: { "Content-Type": "text/html; charset=utf-8" },
      });
    }

    if (url.pathname === OPENAPI_ROUTE) {
      return new Response(JSON.stringify(openapiSpec, null, 2), {
        headers: { "Content-Type": "application/json" },
      });
    }

    // Route to appropriate handler
    if (url.pathname === WORKER_ROUTES.DEBUG_LIST) {
      return handleDebugList(env);
    }

    if (url.pathname === WORKER_ROUTES.DELETE_OLD) {
      return handleDeleteOldRecords(request, env);
    }

    if (url.pathname === WORKER_ROUTES.ROOT) {
      return handleReportRequest(request, env, ctx);
    }

    if (url.pathname === WORKER_ROUTES.GET_BY_PUBLIC_ID) {
      return handleGetByPublicId(request, env);
    }

    // 404 for unknown routes
    return new Response(JSON.stringify({ error: "Not found" }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  },
} satisfies ExportedHandler<Env>;
