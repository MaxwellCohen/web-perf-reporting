/** Instructions for AI agents, served at /llms.txt (https://llmstxt.org). */
export function buildLlmsTxt(siteUrl: string): string {
  const api = `${siteUrl}/api/agent/report`;
  return `# Web Perf Report

> Turns a Lighthouse or PageSpeed Insights JSON report into a compact, ranked list of performance, accessibility, best-practice, and SEO issues, with the offending elements/resources, and a personalized speed-up prompt. Built for coding agents: you run the audit yourself, POST the JSON, and get back a short report. No API key needed.

## How to find performance improvements for a site

1. Run Lighthouse yourself (needs Node and Chrome). Mobile:

   npx -y lighthouse https://example.com --output=json --output-path=mobile.json --only-categories=performance,accessibility,best-practices,seo --disable-full-page-screenshot --skip-audits=screenshot-thumbnails,final-screenshot --chrome-flags="--headless=new" --quiet

   Desktop: same command with \`--preset=desktop --output-path=desktop.json\`.
   Lighthouse runs locally, so localhost and dev/preview servers work. Audit a production build (e.g. \`next build && next start\`), not a dev server.

   Alternative with real-user (CrUX) field data: call the PageSpeed Insights API with your own key:
   curl -o mobile.json "https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=https://example.com&strategy=mobile&category=PERFORMANCE&category=ACCESSIBILITY&category=AGENTIC_BROWSING&category=BEST_PRACTICES&category=SEO&key=$PAGESPEED_API_KEY"
   This only works for publicly reachable URLs.

2. POST the result for analysis (markdown is the most token-efficient):

   curl -s -X POST "${api}?format=md" -H "content-type: application/json" --data-binary @mobile.json

   To analyze mobile and desktop together, POST a JSON array: \`jq -s . mobile.json desktop.json | curl -s -X POST "${api}?format=md" -H "content-type: application/json" --data-binary @-\`

3. Read the report:
   - **Speed-up prompt** (start here): a personalized, step-by-step optimization plan built from this report's failing audits and field data, with the real offending files quoted. Follow it, or hand it as-is to a coding agent working in the site's repo.
   - **Scores** per device (0–100). Below 90 needs work; below 50 is poor.
   - **Lab metrics** (FCP, LCP, TBT, CLS, SI), plus **real-user CrUX p75** (LCP, INP, CLS, FCP, TTFB) when the input came from the PageSpeed Insights API. Prioritize what real users experience.
   - **Issues**: failing audits, most impactful first, with estimated savings and up to 3 examples (CSS selector + HTML snippet, or resource URL). Use the examples to grep the codebase for the component, asset, or script responsible.
   - **Focus areas** (JSON only): the prompt's sections as data (server, LCP, render-blocking, JavaScript, third parties, fonts, images, CLS, caching, page weight), each with evidence and advice.
   - **Platform notes**: Baseline browser-support status of web features the page uses, and Content Security Policy findings.

4. Work through the speed-up prompt one focus area at a time, rebuild, re-run Lighthouse, and POST again to compare. Lab scores vary a few points between runs; compare more than one run before concluding a change helped.

## API

POST ${api}

Body (JSON, under 4 MB — keep the screenshot flags above): one of
- a Lighthouse result (\`lighthouse --output=json\`)
- a PageSpeed Insights v5 API response (\`{ lighthouseResult, loadingExperience, ... }\`)
- an array of the above (e.g. mobile + desktop)

Query parameters:
- \`format\` — \`json\` (default) or \`md\`. \`Accept: text/markdown\` also selects markdown.

Responses:
- 200 — JSON fields: \`url\`, \`speedUpPrompt\` (the personalized prompt, markdown), \`reports[]\` (\`label\`, \`finalUrl\`, \`scores\`, \`lab\`, \`field\`, \`platformNotes\`), \`issues[]\` (\`id\`, \`category\`, \`title\`, \`description\`, \`score\`, \`displayValue\`, \`metricSavings\`, \`savingsBytes\`, \`reports\`, \`examples\`), \`focusAreas[]\` (\`id\`, \`title\`, \`evidence\`, \`advice\`).
- 400 — body is not JSON or contains no Lighthouse result.

## Human UI

- [Viewer](${siteUrl}/viewer): upload the same JSON to explore it with charts, film strip, and full tables.
- [Latest CrUX](${siteUrl}/latest-crux) and [Historical CrUX](${siteUrl}/historical-crux): real-user Core Web Vitals over time.
`;
}
