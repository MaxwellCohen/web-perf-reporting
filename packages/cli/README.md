# @maxwellcohen/web-perf-report

Agent-ready web performance CLI and MCP server. Requires Node 20+.

- **Audit**: runs Lighthouse on a URL and prints a ranked report (analysis by the Web Perf Report API). Needs Chrome.
- **Stream**: measures when each chunk of a page's streamed HTML arrives.
- **Trace**: analyzes a Chrome Performance panel trace locally with the DevTools trace engine.
- **MCP**: exposes all three to agents over stdio.

## Audit

```sh
npx -y @maxwellcohen/web-perf-report https://example.com                         # mobile + desktop, markdown
npx -y @maxwellcohen/web-perf-report https://example.com --device mobile --format json
npx -y @maxwellcohen/web-perf-report --file report.json                          # existing Lighthouse/PSI JSON
```

| Option | Values |
|--------|--------|
| `--device` | `mobile`, `desktop`, `both` (default) |
| `--format` | `md` (default), `json` |
| `--file <path>` | analyze an existing Lighthouse/PSI JSON instead of running Lighthouse |
| `--api <url>` | API base; or env `WEB_PERF_REPORT_API` (default `https://web-perf-report.vercel.app`) |

## Stream

```sh
npx -y @maxwellcohen/web-perf-report stream http://localhost:3000                         # one page
npx -y @maxwellcohen/web-perf-report stream http://localhost:3000 http://localhost:3001   # compare A vs B
```

Prints TTFB, last byte, and the idle gaps where the server is waiting, plus a shareable `/stream` link. Works for localhost. With a second URL it adds a delta table and a `/stream#r=…&b=…` comparison link. Options: `--format md|json`, `--api <url>`.

## Trace

```sh
npx -y @maxwellcohen/web-perf-report trace trace.json                  # overview
npx -y @maxwellcohen/web-perf-report trace insights trace.json.gz
npx -y @maxwellcohen/web-perf-report trace tasks trace.json --tree bottom-up --top 20
npx -y @maxwellcohen/web-perf-report trace find trace.json --function render
npx -y @maxwellcohen/web-perf-report trace scan ./traces --grep EventTiming
```

Runs locally on `.json` or `.json.gz` exports — no Chrome or network needed.

| Command | Shows |
|---------|-------|
| `overview` (default) | Core Web Vitals, main-thread breakdown, warnings |
| `insights` | LCP / INP / CLS / render-blocking / third-party insights |
| `tasks` | long main-thread tasks, or a call tree with `--tree bottom-up\|top-down` |
| `find` | executions of a function (`--function <name>`) |
| `network` | slowest requests (`--render-blocking`, `--slowest <n>`) |
| `interactions` | EventTiming interactions and INP subparts |
| `shifts` | layout-shift clusters and culprits (`--events`) |
| `events` | raw trace events (`--name`, `--cat a,b`, `--phase`, `--fields`) |
| `navigations` | navigations and their insight sets |
| `scan <dir-or-glob>` | search many traces (`--grep <pattern>`) |

Common options: `--format md|json|toon`, `--time-range <start,end>` (ms, or with units like `3.5s,4.2s`), `--absolute-timestamps`. Per-command flags: `trace <command> --help`.

Notes:

- Metric values (LCP, INP, …) are relative to the navigation; task, event, and navigation timestamps are relative to the trace start.
- Render-blocking follows DevTools' RenderBlocking insight: same frame and navigation, finished before first paint, and `in_body_parser_blocking` only at VeryHigh priority or for High-priority scripts. `insights`, `network`, and the web `/trace` viewer all use this rule.
- In `shifts`, as in DevTools, each shift's full score is credited to every element it moved, so culprit scores can add up to more than the cluster score.

## MCP server (stdio)

```json
{ "command": "npx", "args": ["-y", "@maxwellcohen/web-perf-report", "mcp"] }
```

| Tool | Input | Speed |
|------|-------|-------|
| `audit_site` | `url`, `device?` | ~30–90 s |
| `analyze_report` | Lighthouse/PSI report JSON | fast |
| `measure_stream` | `url` | a few seconds |
| `analyze_trace` | `trace` JSON or a local `file`, optional drill-down `command` | local, fast |
