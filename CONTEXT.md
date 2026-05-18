# Domain context (PageSpeed + CrUX)

Short glossary for this repo. Terms align with modules under `src/lib/page-speed-insights/`, `src/features/page-speed-insights/`, and CrUX routes.

## Saved report (`publicId`)

A stable id returned when starting a PageSpeed worker job from the server action flow. The dashboard at `/page-speed/[publicId]` loads rows through the `/api/pagespeed/:publicId` route handler. How that relates to server actions vs client polling is summarized in `src/lib/page-speed-insights/pageSpeedDataFlows.ts`.

## Worker job envelope

JSON the Cloudflare worker returns for a job: `status` plus optional `data` (string body for some paths, or parsed JSON for others). Normalization for Next route responses lives in `workerPagespeedApiAdapter.ts`; HTTP calls live in `pageSpeedWorkerClient.ts`.

## PSI row

One element of the dashboard’s `PageSpeedInsights` array (Zod schema in `src/lib/schema.ts`). Feature code may import the same shape from `src/lib/page-speed-insights/types.ts`.

## CrUX current vs history

- **Current record** — `queryCruxRecord`-style POST to `content-chromeuxreport.googleapis.com` (see `googleCruxApi.ts`).
- **History record** — POST to `chromeuxreport.googleapis.com` for trend data; `getHistoricalCruxData` persists slices to Drizzle.

## Latest CrUX display helpers

Pure transforms for histograms, p75 bars, and date range copy live in `src/lib/crux/latest-crux-display/` (shared by components under `src/components/latest-crux/`).

## Lighthouse viewers

- `/lh` — paste Lighthouse JSON via `LhInputForm`.
- `/viewer` — alternate viewer via `ViewerPage`.

Both use `LighthouseViewerAppShell` for layout; product behavior may diverge intentionally.
