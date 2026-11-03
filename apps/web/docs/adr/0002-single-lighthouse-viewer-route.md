# ADR 0002: Single Lighthouse viewer at `/viewer`

## Status

Accepted. Supersedes ADR 0001 (removed).

## Context

ADR 0001 kept `/lh` (tabbed paste/file/URL form) and `/viewer` (single smart input, compare lanes, share links) as separate surfaces. `/viewer` is the better experience and is the one linked from the home page.

## Decision

`/viewer` is the only Lighthouse viewer. `/lh` is a permanent redirect to `/viewer` configured in `next.config.ts`, preserving query params. The `/lh` page, `LhInputForm`, and its input components were removed; `/lh` is no longer in the sitemap.

## Consequences

- One place to maintain viewer behavior and tests.
- Old `/lh` links keep working.
