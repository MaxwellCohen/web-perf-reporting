# PageSpeed Insights feature architecture

How the saved-report flow is wired.

## Saved report flow

1. **Start** (`src/components/viewer/collectViewerReports.ts`) — Viewer input submits a page URL → `requestPageSpeedData` server action → worker returns `publicId`.
2. **Load** (`src/features/page-speed-insights/data/usePageSpeedInsightsQuery.ts`) — React Query calls `getPageSpeedInsightsByPublicId` in `pageSpeedInsightsClient.ts` → GET `/api/pagespeed/:publicId`.
3. **Worker seam** — Route handler fetches the worker envelope → `resolveWorkerEnvelope` → `workerEnvelopeToHttpResponse` in `workerPagespeedApiAdapter.ts`. HTTP to the worker lives in `pageSpeedWorkerClient.ts`.
4. **UI** — `PageSpeedInsightsDashboardContent` branches on `PageSpeedLoadResult` (`ok` → dashboard, `failed` → `ReportErrorCard`). Dashboard state is built in `pageSpeedDashboardHelpers.ts` and held in `PageSpeedContext.tsx` (XState).

## Other ingress

- **`/page-speed`** input (`/viewer` and `/lh` redirect here) — Paste Lighthouse JSON straight into `PageSpeedInsightsDashboard` (no worker envelope). See ADR 0002.

## Domain types

Labeled PSI rows (`InsightsContextItem`, `PageSpeedDashboardItem`) live in `src/lib/page-speed-insights/types.ts`. Zod schema: `src/lib/schema.ts`.
