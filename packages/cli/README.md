# @maxwellcohen/web-perf-report

Runs Lighthouse on a URL and prints a ranked, agent-ready performance report (analysis by the Web Perf Report API). Needs Node 20+ and Chrome.

```sh
npx -y @maxwellcohen/web-perf-report https://example.com            # mobile + desktop, markdown
npx -y @maxwellcohen/web-perf-report https://example.com --device mobile --format json
npx -y @maxwellcohen/web-perf-report --file report.json             # analyze an existing Lighthouse/PSI JSON
```

Options: `--device mobile|desktop|both`, `--format md|json`, `--file <path>`, `--api <url>` (or env `WEB_PERF_REPORT_API`, default `https://web-perf-report.vercel.app`).

## MCP server (stdio)

```json
{ "command": "npx", "args": ["-y", "@maxwellcohen/web-perf-report", "mcp"] }
```

Tools: `audit_site` (url, device?) and `analyze_report` (report JSON). Audits take ~30-90s.
