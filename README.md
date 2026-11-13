# Web perf reporting (monorepo)

pnpm workspace with a Next.js dashboard, a Void API (Cloudflare Worker), and an agent-ready CLI/MCP server.

| Package | Path | Deploy |
|---------|------|--------|
| Web | [`apps/web`](apps/web) | [Vercel](https://vercel.com) — root directory `apps/web` |
| API | [`apps/api`](apps/api) | Void / Cloudflare — see below |
| CLI + MCP | [`packages/cli`](packages/cli) | npm `@maxwellcohen/web-perf-report` — published by `release.yml` when its version changes |

Features: CrUX latest/history, PageSpeed analysis, Lighthouse viewer (`/viewer`), and streaming-timing reports (`/stream`).

## Working with coding agents

- [`AGENTS.md`](AGENTS.md) (also loaded by Claude Code via `CLAUDE.md`) — layout, commands, conventions.
- [`apps/web/CONTEXT.md`](apps/web/CONTEXT.md) — domain glossary.
- Run `pnpm check` before finishing: typecheck (web, api, cli), lint, and all tests.
- For agents consuming the product: use the CLI/MCP server in [`packages/cli`](packages/cli) or the site's `/llms.txt`.


## Local development

From the repo root:

```bash
pnpm install
pnpm dev:web      # Next.js at http://localhost:3000
pnpm dev:api
```

Other root scripts:

| Script | Purpose |
|--------|---------|
| `pnpm check` | typecheck (web, api, cli) + lint + all tests |
| `pnpm test` | Vitest for web, api, and cli |
| `pnpm typecheck` / `typecheck:api` / `typecheck:cli` | per-package type checks |
| `pnpm lint` | oxlint (web) |
| `pnpm build:web` / `build:api` / `build:cli` | production builds |

Node 24 and pnpm 10 (see `packageManager`). CI path-filters by package: [`.github/workflows/ci.yml`](.github/workflows/ci.yml).

### Environment

| App | Env file | Required variables |
|-----|----------|-------------------|
| `apps/web` | `.env` (see [`.env.example`](apps/web/.env.example)) | `WORKER_URL`, `WORKER_API_KEY`, `NEXT_PUBLIC_POSTHOG_*` |
| `apps/api` | Cloudflare secrets (`void secret put`) | `PAGESPEED_INSIGHTS_API`, `WORKER_API_KEY` |
| `packages/cli` | env `WEB_PERF_REPORT_API` (optional) | none |

If you still have `.env` at the repo root from before the monorepo move, copy it to `apps/web/.env`.

## Vercel (`apps/web`)

In the Vercel project for **web-perf-reporting**:

1. **Root Directory** — `apps/web`
2. **Install Command** (monorepo lockfile at repo root):

   ```bash
   cd ../.. && pnpm install --frozen-lockfile
   ```

3. **Build Command** — `pnpm build` (runs in `apps/web`)
4. **Environment variables** — `WORKER_URL` (Void API, for example `https://web-perf-report-api.<account>.workers.dev`) and `WORKER_API_KEY` (same value as the API worker secret). The Google API key and Turso credentials stay on the API worker.
5. **Ignored Build Step** (optional):

   ```bash
   git diff HEAD^ HEAD --quiet -- apps/web pnpm-lock.yaml pnpm-workspace.yaml package.json
   ```

## Void API (`apps/api`)

The API worker is a separate Cloudflare worker, `web-perf-report-api`. It reuses the existing KV namespace and `api-results` R2 bucket, stores CrUX history in a new D1 database, and queues Google PageSpeed and CrUX calls.

From `apps/api`, with the [Void CLI](https://void.cloud/) logged into the same Cloudflare account:

```bash
pnpm --filter api dev
void secret put PAGESPEED_INSIGHTS_API
void secret put WORKER_API_KEY
pnpm --filter api import:history
void deploy --platform cloudflare
```

`import:history` copies `Historical_Metrics` from Turso into a local SQLite file and prints row counts. After the first deploy creates D1, load that file into the remote database with `void db` (or `wrangler d1 execute`) before pointing `WORKER_URL` at the new worker.

## App docs

- Web app details: [`apps/web/README.md`](apps/web/README.md)
- CLI and MCP server: [`packages/cli/README.md`](packages/cli/README.md)
- Architecture: [`apps/web/docs/architecture-page-speed.md`](apps/web/docs/architecture-page-speed.md)
