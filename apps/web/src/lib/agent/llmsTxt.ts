/** Instructions for AI agents, served at /llms.txt (https://llmstxt.org). */
export function buildLlmsTxt(siteUrl: string): string {
  const api = `${siteUrl}/api/agent/report`;
  return `# Web Perf Report

> Runs Google PageSpeed Insights (Lighthouse, mobile + desktop) and Chrome UX Report field data for any public URL, then returns a compact, ranked list of performance, accessibility, best-practice, and SEO issues with the offending elements/resources and a fix plan. Built for coding agents: one HTTP GET, no API key.

## How to find performance improvements for a site

1. Request a report (blocks up to ~50 s while Lighthouse runs):
   GET ${api}?url=https://example.com&format=md
2. If the response is HTTP 202 (status "pending"), wait \`retryAfterSeconds\` and GET the \`pollUrl\` it returns (same as ${api}?id=<publicId>). Repeat until HTTP 200. A full run usually takes 30–90 s.
3. Read the report:
   - **Scores** per device (0–100). Below 90 needs work; below 50 is poor.
   - **Lab metrics** (FCP, LCP, TBT, CLS, SI) and **real-user CrUX p75** (LCP, INP, CLS, FCP, TTFB). Prioritize what real users experience; INP is field-only.
   - **Issues**: failing audits, most impactful first, with estimated savings and up to 3 examples (CSS selector + HTML snippet, or resource URL). Use the examples to grep the codebase for the component, asset, or script responsible.
   - **Fix plan**: grouped focus areas (server, LCP, render-blocking, JavaScript, third parties, fonts, images, CLS, caching, page weight) with evidence and framework-agnostic advice.
4. Fix one focus area at a time, deploy or run a production build at a public URL, and request a new report to compare. Results for the same URL are reused for a few days; add a cache-busting query parameter (e.g. \`?v=2\`) to the tested URL to force a fresh run.

## API

GET ${api}

Query parameters:
- \`url\` — page to test (scheme optional). Starts a run, or returns the cached one for that exact URL.
- \`id\` — publicId of an existing run. Use instead of \`url\` to poll.
- \`format\` — \`json\` (default) or \`md\`. \`Accept: text/markdown\` also selects markdown. Markdown is the most token-efficient way to read a report.
- \`wait\` — seconds to block waiting for completion, 0–50 (default 50).

Responses:
- 200 — completed. JSON fields: \`publicId\`, \`url\`, \`dashboardUrl\` (human UI with charts, film strip, and full tables), \`reports[]\` (\`label\`, \`scores\`, \`lab\`, \`field\`), \`issues[]\` (\`id\`, \`category\`, \`title\`, \`description\`, \`score\`, \`displayValue\`, \`metricSavings\`, \`savingsBytes\`, \`reports\`, \`examples\`), \`focusAreas[]\` (\`id\`, \`title\`, \`evidence\`, \`advice\`), and \`prompt\` (the fix plan as text).
- 202 — still running. JSON: \`status: "pending"\`, \`publicId\`, \`pollUrl\`, \`retryAfterSeconds\`.
- 400 — missing or invalid \`url\`/\`id\`. 404 — unknown \`id\`. 502 — PageSpeed failed (often the page is unreachable, blocks Google's crawler, or timed out).

## Limits

- Only publicly reachable URLs work; localhost and pages behind a login cannot be tested. Use a preview deployment or a tunnel.
- Lab scores vary a few points between runs. Compare more than one run before concluding a change helped.
- CrUX field data only exists for pages/origins with enough Chrome traffic; it may be absent for new or low-traffic sites.

## Human UI

- [PageSpeed dashboard](${siteUrl}/page-speed?url=https://example.com): the same run with full visualizations.
- [Latest CrUX](${siteUrl}/latest-crux) and [Historical CrUX](${siteUrl}/historical-crux): real-user Core Web Vitals over time.
`;
}
