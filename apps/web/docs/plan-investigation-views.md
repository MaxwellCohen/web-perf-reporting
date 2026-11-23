# Investigation views for the PSI dashboard

## Context
Five approved design concepts (artifact M6zGxdhuXHfDa9eGbYknhS) were rejected as the Overview page but liked as investigation views. Build them into non-Overview tabs of `apps/web/src/features/page-speed-insights/dashboard-view/PageSpeedDashboardView.tsx`, wired to real report data, one concept per PR. `OverviewTabPanel.tsx` is untouched.

## How tabs work (found)
- `TABS` array in `PageSpeedDashboardView.tsx:17` — `{ value, label, Panel }`, panels lazy via `next/dynamic`, take no props; read data via `usePageSpeedItems()` (`PageSpeedContext.tsx:99`) → `PageSpeedDashboardItem[] = { item: PageSpeedInsights, label }` (one per run/form factor; compare = 2 items).
- Tab ids + URL state in `dashboard-view/dashboardSearch.ts` (`DASHBOARD_TABS`, `DashboardSearchState`, `patchDashboardSearch`). New tab = add id there + entry in `TABS`. Deep links use `patchDashboardSearch({ tab, audit, signals, stage, suspect, ... }, "push")`.
- Lab data: `item.lighthouseResult.audits` incl. all `*-insight` audits (fixture `apps/web/test-fixtures/example-report.json`). Field: `item.loadingExperience` / `originLoadingExperience`.
- **No `scoringOptions` in the stored audits** → points-gained must use hard-coded Lighthouse v12 log-normal curves (p10/median per form factor, from `configSettings.formFactor`).

## Placement (confirmed by user)
| # | Concept | Tab | Why |
|---|---------|-----|-----|
| 1 | Diagnosis columns | **new "Diagnose" tab** (after Overview) | metric→part→cause drill-down is the entry point for investigation |
| 2 | Hypothesis triage | **Diagnose tab**, second section (segmented toggle "By metric / By cause") | same question, different lens; shares the cause catalog |
| 3 | Impact (ranked, no effort axis) | **Recommendations** (new top section above the existing list) | it is a ranked view of the same opportunities |
| 4 | Critical path timeline | **Timeline** (a "Explain LCP/FCP/TBT" mode above the existing vertical timeline) | reuses waterfall + filmstrip + long tasks already loaded there |
| 5 | Culprit matrix | **Resources** (new section/stage "By file") | per-URL attribution is what Resources is about |

## Shared foundation (PR 0, small)
`dashboard-view/investigate/` (pure, tested):
- `metricScoring.ts` — LH v12 curves; `pointsLost(metric)` = `weight × (1 − score)` (reuse `summarizeReport` in `reportScoreSummary.ts:79`); `estimatePointsGained(item, savingsByAcronym)` = Σ weight × (score(value − saving) − score(value)). Clamp, label "est."
- `fieldP75.ts` — p75 per metric from `loadingExperience` (LCP, FCP, CLS, INP, TTFB) with origin fallback flag.
- `fixPrompt.ts` — `buildFixPrompt({ url, formFactor, title, evidence, fix })` markdown, same report-context style as `speedUpPrompt.ts`; copy via `CopyButton` (`components/ui/copy-button.tsx`).
- `causeCatalog.ts` — one entry per cause: `{ id, question, audits[], metrics[], tab deep-link, fixText, evaluate(audits) → { verdict, costMs|cls, summary, evidence[] } }`. Used by concepts 1, 2, 3, 5.

## Per concept: data sources and gaps
**1 Diagnosis columns** — `Diagnose`
- Col 1: `summarizeReport().metrics` sorted by points lost; field p75 from `fieldP75`.
- Col 2 breakdown: LCP → `lcp-breakdown-insight` subparts (TTFB / load delay / load duration / render delay) + `collectLcpElements` (`lcpElement.ts`); TBT → `summarizeLongTaskScripts` (`mainThreadTaskSummary.ts:163`); CLS → `cls-culprits-insight` / `layout-shifts` items; FCP → `document-latency-insight` TTFB + `render-blocking-insight` items; SI → render-blocking + font-display.
- Col 3 causes: `collectCauseAuditsForMetric` (`metricCauseAudits.ts:92`) filtered to the part via catalog mapping; render evidence with existing `MetricCauseCard` internals. Links: timeline (`tab=timeline`), raw audit (`tab=audits&audit=<id>`).
- Gap: part→cause mapping is a static heuristic table; per-part "status" thresholds (good/ni/poor) are our own (e.g. share of metric).

**2 Hypothesis triage** — `Diagnose`
- 12 checks from `causeCatalog`: lcp-discovery, image-delivery, long tasks (`main-thread-tasks`/`bootup-time`), render-blocking, cls-culprits, unused-javascript, third-parties, document-latency + field TTFB, network-dependency-tree, dom-size, cache, legacy-javascript.
- Verdict: Confirmed if audit fails & metricSavings ≥ threshold; Contributes if > 0 or below-threshold failure; Ruled out if passes / n/a. Sort by cost (ms; CLS ranked separately at end of its verdict group).
- Gap: thresholds are ours; "cost" = max metricSavings across metrics (overlaps acknowledged in copy).

**3 Impact (effort axis dropped per user)** — `Recommendations`
- Ranked horizontal bar list of opportunities by estimated points gained (numbered, metric filter All/LCP/TBT/CLS/FCP), detail panel with files + savings, "Add to plan", projected score, "Copy plan as prompt". No scatter plot, no effort data.
- Opportunities = audits with `metricSavings` (reuse `Recommendation` list from `RecommendationsSection/extractRecommendations.ts` + `recommendationsStoryModel.ts`). Files = `details.items` url + wastedBytes/wastedMs.
- Points gained via `estimatePointsGained`. Plan state is local component state; projected score = min(100, now + Σ gained) with "not additive" note.
- Gap: points are estimates from LH v12 curves; savings overlap.

**4 Critical path timeline** — `Timeline`
- Rows: `buildWaterfallRowsFromSources` / `waterfallSignals.ts` (critical chain, long tasks, render-blocking signals already exist); filmstrip `RenderFilmStrip`; LCP phases from `lcp-breakdown-insight` (`waterfallRowFromLcpSegments`, `waterfallData.ts:671`).
- Explain mode: LCP → keep LCP request, its initiator chain (`network-dependency-tree-insight`) and render-blocking; FCP → document + render-blocking before FCP; TBT → long tasks within `blockingWindowFromMetricsAudit` window + their script requests. Everything else faded. Detail panel = request facts + matching catalog cause.
- Gap: "why it matters" text is templated from signals, not measured causality.

**5 Culprit matrix** — `Resources`
- Per URL: LCP = LCP resource load delay/duration if url is LCP image, + render-blocking wastedMs; FCP = render-blocking wastedMs; TBT = long-task blocking per script (`summarizeLongTaskScripts`); CLS = `cls-culprits-insight` / `layout-shifts` attributed to url; bytes = `network-requests` transferSize. 1P/3P via `third-parties-insight` entity / existing resources-story party logic (`investigationRows.ts`).
- Findings on expand: every audit whose `details.items` lists that url, with savings.
- Gap: columns overlap (noted in UI); CLS attribution to a file only when the insight names a url.

## Compare mode & form factor
- Use `shared/compareRuns.ts` (`getCompareRuns`, `pairByFormFactor`) and `shared/reportLabels.ts` (`splitReportLabel`) like `ReportScoreOverview` does; per-report data via `collectTimelineSources(item)` (`CombinedLoad`, `page-load-timeline/collectTimelineSources.ts:159`) for concepts 4 and 5 (requests, long tasks, entity/1P-3P, renderBlocking, LCP segments) and `mergeRows` (`resources-story/investigationRows.ts`) for per-URL attribution.
- Every view picks one report via the existing `report=` pattern (`resolveCompareSelection`, `shared/compareSelection.ts`), defaulting to the first mobile report. Single report → full view. Two reports → Diagnose/Triage/Culprits show a delta column (B − A) next to values; Impact-vs-effort and Critical path show report A with a report switcher (side-by-side charts don't read well).
- Form factor only changes the scoring curves (`configSettings.formFactor`); labels show "mobile"/"desktop".

## PR sequence (each branch off `origin/main`, ~300–500 lines)
0. `feat/investigate-foundation` — scoring, field p75, cause catalog, fix prompt + tests (no UI).
1. `feat/diagnose-tab` — Diagnose tab + Diagnosis columns.
2. `feat/diagnose-triage` — Triage section in Diagnose.
3. `feat/culprit-matrix` — Resources.
4. `feat/impact-effort` — Recommendations.
5. `feat/critical-path-explain` — Timeline.
(PR 1+ depend on PR 0 merging first.)

## Verification
- Colocated Vitest per model (`*.test.ts`) using `test-fixtures/example-report.json`; component smoke tests like `RecommendationsStory.test.tsx`.
- `pnpm check` before each push; `pnpm dev:web`, open a saved report, check each tab in single + compare mode, mobile + desktop.
