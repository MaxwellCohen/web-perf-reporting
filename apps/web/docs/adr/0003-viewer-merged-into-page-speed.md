# ADR 0003: Viewer merged into `/page-speed`

## Status

Accepted. Supersedes the route choice in ADR 0002.

## Decision

`/page-speed` hosts the single smart input (`ViewerPage`): a page URL runs PageSpeed Insights; a PSI share link, Lighthouse JSON, or file opens it directly. `/viewer` and `/lh` redirect to `/page-speed` (`next.config.ts`, query params preserved). Legacy `?url=` is treated as a page URL to measure. Saved reports stay at `/page-speed/[publicId]`.
