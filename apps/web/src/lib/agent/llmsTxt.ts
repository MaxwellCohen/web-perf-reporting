/** Instructions for AI agents, served at /llms.txt (https://llmstxt.org). */
export function buildLlmsTxt(siteUrl: string): string {
  const api = `${siteUrl}/api/agent/report`;
  return `# Web Perf Report

> Turns a Lighthouse or PageSpeed Insights JSON report into a compact, ranked list of performance, accessibility, best-practice, and SEO issues, with the offending elements/resources, and a personalized speed-up prompt. Built for coding agents: you run the audit yourself, POST the JSON, and get back a short report. No API key needed.

## How to find performance improvements for a site

1. Run one command (needs Node and Chrome). It runs Lighthouse for mobile and desktop and prints the report:

   npx -y @maxwellcohen/web-perf-report https://example.com

   If npx cannot find the package, use the manual flow in step 2.

   Options: \`--device mobile|desktop|both\`, \`--format md|json\`, \`--file report.json\` (analyze an existing Lighthouse/PSI JSON). Lighthouse runs locally, so localhost and dev/preview servers work. Audit a production build (e.g. \`next build && next start\`), not a dev server.

   MCP: to give your agent \`audit_site\` and \`analyze_report\` tools, add this stdio server config: \`{"command":"npx","args":["-y","@maxwellcohen/web-perf-report","mcp"]}\`

2. Alternative / manual: run Lighthouse yourself and POST the JSON.

   Mobile:

   npx -y lighthouse https://example.com --output=json --output-path=mobile.json --only-categories=performance,accessibility,best-practices,seo --disable-full-page-screenshot --skip-audits=screenshot-thumbnails,final-screenshot --chrome-flags="--headless=new" --quiet

   Desktop: same command with \`--preset=desktop --output-path=desktop.json\`.
   Lighthouse runs locally, so localhost and dev/preview servers work. Audit a production build (e.g. \`next build && next start\`), not a dev server.

   Alternative with real-user (CrUX) field data: call the PageSpeed Insights API with your own key:
   curl -o mobile.json "https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=https://example.com&strategy=mobile&category=PERFORMANCE&category=ACCESSIBILITY&category=AGENTIC_BROWSING&category=BEST_PRACTICES&category=SEO&key=$PAGESPEED_API_KEY"
   This only works for publicly reachable URLs.

   POST the result for analysis (markdown is the most token-efficient):

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

## Rules

- Work on a new branch; don't push or deploy.
- Only POST pages you may share.
- Run each audit 3 times (re-run the command) and compare medians. Revert changes that fail tests or don't help.
- End with a before/after table.

## Streaming timing (when does the HTML actually finish?)

Streaming frameworks (Next.js, etc.) send the shell fast, then stream Suspense content as slow data resolves, so total document time can be dominated by one late chunk. This records when each chunk of the HTML arrives and reports the idle "waiting" gaps.

- localhost / dev / preview (measured on this machine; Node 20+; use a production build) with the CLI:
  npx -y @maxwellcohen/web-perf-report stream http://localhost:3000
  Compare two (A = first URL, B = second; e.g. before/after a change or two builds on different ports):
  npx -y @maxwellcohen/web-perf-report stream http://localhost:3000 http://localhost:3001
  Add \`--format json\` for JSON. It is also the \`measure_stream\` tool (url, compareUrl?) of the CLI's MCP server.
- Public site (measured from the server, no install):
  curl -s "${siteUrl}/api/agent/stream?url=https://example.com&format=md"
  Compare: add \`&compare=https://other.example\`.
- No Node CLI available: \`curl -s ${siteUrl}/measure-stream.mjs | node - http://localhost:3000\` (single URL). The script only fetches the given URL and POSTs the chunk timings to this site; read it first if you prefer (curl the URL without the pipe).

Output (markdown): TTFB, first chunk, last byte, idle waiting (gaps >= 100ms) and its share of the body span, each gap with the chunk that arrived after it (Suspense completions show as \`$RC(\` scripts or \`<div hidden id="S:\` segments, marked "Suspense" on the page), and a shareable link to ${siteUrl}/stream. With two URLs you also get a delta table (B − A; negative is better) and a one-line verdict. A long gap means a server-side await inside a Suspense boundary: find that boundary's data fetch and speed up or cache it.

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

## Trace analysis (POST /api/agent/trace)

Record a Chrome trace of any URL and get findings back:

\`node scripts/record-trace.mjs <url> --cpu 4 --api ${siteUrl} --format md\`

Or POST an existing trace (.json, under 4 MB) to \`${siteUrl}/api/agent/trace\`. \`?format=md\` returns the fix prompt; the default JSON has \`summary\`, \`metrics\` (ttfb, fcp, lcp, cls, blockingMs), \`analysis\` (key events, phases, scripts, hot functions) and \`brief\`. 400 means the body was not a usable trace. For the interactive timeline, open \`${siteUrl}/trace\`.

## Human UI

- [Viewer](${siteUrl}/viewer): upload the same JSON to explore it with charts, film strip, and full tables.
- [Latest CrUX](${siteUrl}/latest-crux) and [Historical CrUX](${siteUrl}/historical-crux): real-user Core Web Vitals over time.
`;
}
