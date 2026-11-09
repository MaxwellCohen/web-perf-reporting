# @maxwellcohen/web-perf-report

Runs Lighthouse on a URL and prints a ranked, agent-ready performance report (analysis by the Web Perf Report API). Needs Node 20+ and Chrome.

```sh
npx -y @maxwellcohen/web-perf-report https://example.com            # mobile + desktop, markdown
npx -y @maxwellcohen/web-perf-report https://example.com --device mobile --format json
npx -y @maxwellcohen/web-perf-report --file report.json             # analyze an existing Lighthouse/PSI JSON
```

```sh
npx -y @maxwellcohen/web-perf-report stream http://localhost:3000   # when does the streamed HTML actually finish?
npx -y @maxwellcohen/web-perf-report stream http://localhost:3000 http://localhost:3001   # compare two (A vs B)
```

`stream` records when each chunk of the page's HTML arrives (works for localhost), then prints TTFB, last byte, the idle gaps where the server is waiting, and a shareable `/stream` link. Pass a second URL to compare A and B (before/after, two builds); the report shows the delta table and a shareable `/stream#r=…&b=…` link. Options: `--format md|json`, `--api <url>`.

```sh
npx -y @maxwellcohen/web-perf-report trace performance-trace.json         # CWV + main-thread breakdown
npx -y @maxwellcohen/web-perf-report trace insights performance-trace.json.gz
npx -y @maxwellcohen/web-perf-report trace tasks performance-trace.json --tree bottom-up --top 20
npx -y @maxwellcohen/web-perf-report trace find performance-trace.json --function "render"
npx -y @maxwellcohen/web-perf-report trace scan ./traces --grep "EventTiming"
```

`trace` analyzes a Chrome Performance panel export (`.json` or `.json.gz`) locally with the same trace engine DevTools uses — no Chrome and no network needed. Commands: `overview` (default), `insights`, `tasks`, `find`, `network`, `interactions`, `shifts`, `events`, `navigations`, and `scan`. Options: `--format md|json|toon`, `--time-range <start,end>` (e.g. `3.5s,4.2s`), plus per-command flags shown in `trace --help`.

Options: `--device mobile|desktop|both`, `--format md|json`, `--file <path>`, `--api <url>` (or env `WEB_PERF_REPORT_API`, default `https://web-perf-report.vercel.app`).

## MCP server (stdio)

```json
{ "command": "npx", "args": ["-y", "@maxwellcohen/web-perf-report", "mcp"] }
```

Tools: `audit_site` (url, device?), `analyze_report` (report JSON), `measure_stream` (url) and `analyze_trace` (trace JSON or a local `file`, plus an optional drill-down `command`). Audits take ~30-90s; `measure_stream` takes a few seconds; `analyze_trace` is local and fast.
