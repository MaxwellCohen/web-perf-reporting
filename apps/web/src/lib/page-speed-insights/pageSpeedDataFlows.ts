/**
 * How saved PageSpeed reports move through the app (see CONTEXT.md).
 *
 * **Start (server)**
 * `/page-speed` form → `requestPageSpeedData` in `pageSpeedInsights.service.ts`
 * → `fetchWorkerStartMeasurement` → worker returns `publicId` → redirect to
 * `/page-speed/[publicId]`.
 *
 * **Load (client)**
 * `PageSpeedInsightsDashboardContent` → `usePageSpeedInsightsQueryByPublicId`
 * → `getPageSpeedInsightsByPublicId` in `pageSpeedInsightsClient.ts`
 * → GET `/api/pagespeed/:publicId` → `resolveWorkerEnvelope` + `workerEnvelopeToHttpResponse`.
 *
 * **Other surfaces**
 * `/viewer` and `/lh` paste Lighthouse JSON directly into `PageSpeedInsightsDashboard`
 * (no worker envelope). See ADR 0001.
 */

export {};
