# PageSpeed Insights feature architecture

This document describes how the PageSpeed Insights dashboard is wired so you can navigate the codebase quickly.

## Flow

1. **Routes** (`src/app/page-speed/`) — Server components and thin client wrappers handle navigation, loading, and error UI.
2. **Data** (`src/features/page-speed-insights/data/usePageSpeedInsightsQuery.ts`) — React Query loads PSI JSON from `/api/pagespeed` (URL lookup) or `/api/pagespeed/[publicId]` (saved report).
3. **State** (`src/features/page-speed-insights/PageSpeedContext.tsx`) — An XState store derives labeled dashboard items, titles, and screenshot maps from raw PSI arrays.
4. **UI** (`src/features/page-speed-insights/`) — Sections under `lh-categories/`, `RecommendationsSection/`, `JSUsage/`, `javascript-metrics/`, and `network-metrics/` consume the store via selectors and hooks.

## Domain types

Shared types for labeled PSI rows (`InsightsContextItem`, `PageSpeedDashboardItem`) live in `src/lib/page-speed-insights/types.ts` so non-React code does not depend on React context modules.

## API

Route handlers in `src/app/api/pagespeed/` proxy to the Cloudflare worker. Shared worker URL building lives in `src/lib/page-speed-insights/pageSpeedWorkerClient.ts`.
