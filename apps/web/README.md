# Web Performance Reporting — web app

Next.js app for inspecting site performance with real-user and lab data. Google API calls, caching, and CrUX history go through the Void API worker ([`apps/api`](../api)); this app calls it with `WORKER_URL` / `WORKER_API_KEY`.

## Routes

| Route | Purpose |
|-------|---------|
| `/` | overview |
| `/latest-crux` | current CrUX metrics for a URL or origin |
| `/historical-crux` | CrUX history charts |
| `/page-speed` | PageSpeed Insights: run a URL, import a PSI link, or open Lighthouse JSON; saved reports at `/page-speed/[publicId]` (`/viewer` and `/lh` redirect here) |
| `/stream` | streamed-HTML chunk timing |
| `/trace` | Chrome trace timeline and insights, parsed in the browser |
| `/llms.txt` | agent guide to the site and APIs |
| `/api/agent/report`, `/api/agent/stream`, `/api/agent/trace` | agent APIs (see `/llms.txt`) |

## Stack

Next.js 16 (canary), React 19, TypeScript, Tailwind CSS 4, Vitest + Testing Library, Playwright, PostHog, Sentry.

## Getting started

From the [repo root](../../README.md):

```bash
pnpm install
pnpm dev:web      # http://localhost:3000
```

Copy [`.env.example`](.env.example) to `.env` and set:

| Variable | Notes |
|----------|-------|
| `WORKER_URL`, `WORKER_API_KEY` | Void API worker URL and its shared key (required) |
| `NEXT_PUBLIC_SITE_URL` | canonical URL for metadata, robots, sitemap |
| `NEXT_PUBLIC_POSTHOG_KEY`, `NEXT_PUBLIC_POSTHOG_HOST` | analytics |
| `SENTRY_DSN`, `NEXT_PUBLIC_SENTRY_DSN` | optional; defaults are in `sentry.*.config.ts` |

## Scripts (run in `apps/web`)

| Script | Purpose |
|--------|---------|
| `pnpm dev` / `build` / `start` | Next.js |
| `pnpm test` / `test:watch` / `test:coverage` | Vitest (happy-dom, 80% coverage thresholds) |
| `pnpm test:e2e` | Playwright |
| `pnpm typecheck` | `tsgo --noEmit` |
| `pnpm lint` / `lint:fix` | oxlint |
| `pnpm fmt` / `fmt:check` | oxfmt |
| `pnpm knip` / `dupes` | unused code / duplication checks |
| `pnpm db:generate` / `db:migrate` / `db:studio` | Drizzle (legacy Turso schema in `migrations/`; history now lives in the API's D1) |

## More docs

- Domain glossary: [`CONTEXT.md`](CONTEXT.md)
- Architecture: [`docs/architecture-page-speed.md`](docs/architecture-page-speed.md), decisions in [`docs/adr`](docs/adr)
