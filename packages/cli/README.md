# @maxwellcohen/web-perf-report

Runs Lighthouse on a URL and prints a ranked, agent-ready performance report (analysis by the Web Perf Report API). Needs Node 20+ and Chrome.

```sh
npx -y @maxwellcohen/web-perf-report https://example.com            # mobile + desktop, markdown
npx -y @maxwellcohen/web-perf-report https://example.com --device mobile --format json
npx -y @maxwellcohen/web-perf-report --file report.json             # analyze an existing Lighthouse/PSI JSON
```

```sh
npx -y @maxwellcohen/web-perf-report stream http://localhost:3000   # when does the streamed HTML actually finish?
```

`stream` records when each chunk of the page's HTML arrives (works for localhost), then prints TTFB, last byte, the idle gaps where the server is waiting, and a shareable `/stream` link. Options: `--format md|json`, `--api <url>`.

Options: `--device mobile|desktop|both`, `--format md|json`, `--file <path>`, `--api <url>` (or env `WEB_PERF_REPORT_API`, default `https://web-perf-report.vercel.app`).

## MCP server (stdio)

```json
{ "command": "npx", "args": ["-y", "@maxwellcohen/web-perf-report", "mcp"] }
```

Tools: `audit_site` (url, device?), `analyze_report` (report JSON) and `measure_stream` (url). Audits take ~30-90s; `measure_stream` takes a few seconds.
