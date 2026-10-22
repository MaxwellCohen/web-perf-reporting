# Web perf reporting (monorepo)

pnpm workspace containing the Next.js dashboard and the Cloudflare PageSpeed worker.

| Package | Path | Deploy |
|---------|------|--------|
| Web | [`apps/web`](apps/web) | [Vercel](https://vercel.com) — root directory `apps/web` |
| Worker | [`apps/worker`](apps/worker) | [Cloudflare Workers](https://dash.cloudflare.com) — project root `apps/worker` |

Both apps deploy from this repo via **dashboard Git integrations** (no GitHub Actions required).

## Local development

From the repo root:

```bash
pnpm install
pnpm dev:web      # Next.js at http://localhost:3000
pnpm dev:worker   # wrangler dev
```

Other root scripts: `pnpm test`, `pnpm typecheck`, `pnpm build:web`, `pnpm check:worker`.

### Environment

| App | Env file | Required variables |
|-----|----------|-------------------|
| `apps/web` | `.env` (see [`.env.example`](apps/web/.env.example)) | `WORKER_URL`, `WORKER_API_KEY`, `NEXT_PUBLIC_POSTHOG_*` |
| `apps/worker` | `.dev.vars` (see [`.dev.vars.example`](apps/worker/.dev.vars.example)) | `PAGESPEED_INSIGHTS_API` |
| `apps/api` | `.env` (see [`.env.example`](apps/api/.env.example)) | `PAGESPEED_INSIGHTS_API`, `WORKER_API_KEY` |

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

## Cloudflare Workers (`apps/worker`)

In Workers & Pages → **web-perf-report-cf** (or reconnect Git):

1. **Repository** — `MaxwellCohen/web-perf-reporting`, branch `main`
2. **Root directory** — `apps/worker`
3. **Wrangler config** — `apps/worker/wrangler.toml`
4. **Secrets** — `PAGESPEED_INSIGHTS_API` (dashboard or `wrangler secret`)
5. KV/R2 bindings in `wrangler.toml` must match your account

After migration, archive the standalone [`web-perf-report-cf`](https://github.com/MaxwellCohen/web-perf-report-cf) repo.

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

`import:history` copies `Historical_Metrics` from Turso into a local SQLite file and prints row counts. After the first deploy creates D1, load that file into the remote database with `void db` (or `wrangler d1 execute`) before pointing `WORKER_URL` at the new worker. Leave `web-perf-report-cf` deployed until a PageSpeed report shows its loading state and then the result.

## App docs

- Web app details: [`apps/web/README.md`](apps/web/README.md)
- Worker: [`apps/worker/README.md`](apps/worker/README.md)
