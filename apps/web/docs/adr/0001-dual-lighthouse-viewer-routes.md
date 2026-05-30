# ADR 0001: Keep `/lh` and `/viewer` as separate Lighthouse surfaces

## Status

Accepted

## Context

The app exposes two similar routes for Lighthouse JSON: `/lh` (`LhInputForm`) and `/viewer` (`ViewerPage`).

## Decision

Keep both routes. They share `LighthouseViewerAppShell` for layout only; parsing and UX may continue to diverge.

## Consequences

- Contributors choose the route by product intent (quick paste vs alternate viewer) rather than a single merged page.
- Shared layout reduces duplicate wrapper markup; deeper merge remains optional.
