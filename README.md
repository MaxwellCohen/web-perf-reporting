# Web perf reporting (monorepo)

pnpm workspace containing the Next.js dashboard and the Void API (Cloudflare worker).

| Package | Path | Deploy |
|---------|------|--------|
| Web | [`apps/web`](apps/web) | [Vercel](https://vercel.com) — root directory `apps/web` |
| API | [`apps/api`](apps/api) | Void / Cloudflare — see below |


## Local development

From the repo root:

```bash
pnpm install
pnpm dev:web      # Next.js at http://localhost:3000
pnpm dev:api
```

Other root scripts: `pnpm test`, `pnpm typecheck`, `pnpm build:web`.

### Environment

| App | Env file | Required variables |
|-----|----------|-------------------|
| `apps/web` | `.env` (see [`.env.example`](apps/web/.env.example)) | `WORKER_URL`, `WORKER_API_KEY`, `NEXT_PUBLIC_POSTHOG_*` |
| `apps/api` | Cloudflare secrets (`void secret put`) | `PAGESPEED_INSIGHTS_API`, `WORKER_API_KEY` |

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
