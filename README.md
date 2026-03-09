# Web Performance Reporting

Web Performance Reporting is a Next.js app for inspecting site performance with a mix of real-user and lab data. It combines Chrome UX Report (CrUX) views, PageSpeed Insights analysis, and Lighthouse report exploration in one interface.

## Features

- Latest CrUX metrics for a URL or origin
- Historical CrUX trend views
- PageSpeed Insights analysis with audit details and recommendations
- Lighthouse report viewer
- UI and helper tests powered by Vitest and Testing Library

## Tech Stack

- Next.js 16
- React 19
- TypeScript
- Tailwind CSS
- Drizzle ORM
- Turso / libSQL
- Vitest + Testing Library

## Getting Started

### 1. Install dependencies

Examples below use `pnpm`.

```bash
pnpm install
```

### 2. Create a local env file

Create `.env` in the project root with the values your local environment needs:

```bash
PAGESPEED_INSIGHTS_API=your_google_pagespeed_api_key
TURSO_CONNECTION_URL=your_turso_database_url
TURSO_AUTH_TOKEN=your_turso_auth_token
NEXT_PUBLIC_POSTHOG_KEY=your_posthog_project_key
NEXT_PUBLIC_POSTHOG_HOST=https://us.i.posthog.com
```

### 3. Run the app

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

## Available Routes

- `/` - overview page
- `/latest-crux` - current CrUX metrics
- `/historical-crux` - historical CrUX charts
- `/page-speed` - PageSpeed Insights lookup flow
- `/viewer` - Lighthouse report viewer

## Scripts

```bash
pnpm dev
pnpm build
pnpm start
pnpm lint
pnpm typecheck
pnpm test
pnpm test:watch
pnpm test:coverage
pnpm prettier
pnpm db:generate
pnpm db:migrate
pnpm db:studio
```

## Testing

Vitest is configured with:

- `jsdom` for component and DOM-focused tests
- alias support for `@/`
- shared setup in `vitest.setup.ts`
- coverage reporting through V8
- global coverage thresholds of 80%

Run the full test suite:

```bash
pnpm test
```

Run tests in watch mode:

```bash
pnpm test:watch
```

Generate a coverage report:

```bash
pnpm test:coverage
```

## Database Notes

The app uses Drizzle with a Turso/libSQL database connection. Migration files live in `migrations/`, and the Drizzle config is defined in `drizzle.config.ts`.

## External Services

- Google PageSpeed Insights API
- Chrome UX Report data sources
- Turso / libSQL
- PostHog
- Sentry
