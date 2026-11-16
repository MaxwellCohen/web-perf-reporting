# Domain context (PageSpeed + CrUX)

Short glossary for this repo. Terms align with modules under `src/lib/page-speed-insights/`, `src/features/page-speed-insights/`, and CrUX routes.

## Saved report (`publicId`)

A stable id returned when starting a PageSpeed worker job from the server action flow. The dashboard at `/page-speed/[publicId]` loads rows through GET `/api/pagespeed/:publicId`. Start vs load paths are documented in `docs/architecture-page-speed.md`.

## Worker job envelope

JSON the Cloudflare worker returns for a job: `status` plus optional `data` and `url`. Normalization and the API response body (`{ state: pending | failed | ready }`) live in `resolveWorkerEnvelope.ts`; worker HTTP in `pageSpeedWorkerClient.ts`.

## PSI row

One element of the dashboard’s `PageSpeedInsights` array (Zod schema in `src/lib/schema.ts`). Feature code may import the same shape from `src/lib/page-speed-insights/types.ts`.

## CrUX current vs history

- **Current record** — `queryCruxRecord`-style POST to `content-chromeuxreport.googleapis.com` (see `googleCruxApi.ts`).
- **History record** — POST to `chromeuxreport.googleapis.com` for trend data; `getHistoricalCruxData` persists slices to Drizzle.

## Latest CrUX display helpers

Pure transforms for histograms, p75 bars, and date range copy live in `src/lib/crux/latest-crux-display/` (shared by components under `src/components/latest-crux/`).

## Lighthouse viewer

- `/page-speed` — single entry (`ViewerPage`): page URL runs PSI; PSI link/JSON/file opens a report; compare and share links. `/viewer` and `/lh` redirect here. See ADR 0003.
