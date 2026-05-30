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
| `apps/web` | `.env` (see [`.env.example`](apps/web/.env.example)) | `PAGESPEED_INSIGHTS_API`, `TURSO_*`, `NEXT_PUBLIC_POSTHOG_*`, `WORKER_URL` |
| `apps/worker` | `.dev.vars` (see [`.dev.vars.example`](apps/worker/.dev.vars.example)) | `PAGESPEED_INSIGHTS_API` |

If you still have `.env` at the repo root from before the monorepo move, copy it to `apps/web/.env`.

## Vercel (`apps/web`)

In the Vercel project for **web-perf-reporting**:

1. **Root Directory** — `apps/web`
2. **Install Command** (monorepo lockfile at repo root):

   ```bash
   cd ../.. && pnpm install --frozen-lockfile
   ```

3. **Build Command** — `pnpm build` (runs in `apps/web`)
4. **Environment variables** — include existing vars plus **`WORKER_URL`** (production worker URL, e.g. `https://web-perf-report-cf.<account>.workers.dev`)
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

## App docs

- Web app details: [`apps/web/README.md`](apps/web/README.md)
- Worker: [`apps/worker/README.md`](apps/worker/README.md)
