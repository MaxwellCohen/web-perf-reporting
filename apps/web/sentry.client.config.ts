// This file configures the initialization of Sentry on the client.
// The config you add here will be used whenever a users loads a page in their browser.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs";

const SENTRY_DSN =
  process.env.SENTRY_DSN ??
  process.env.NEXT_PUBLIC_SENTRY_DSN ??
  "https://b7cede0645ba73a5c7bea46b4073b157@o4508042447552512.ingest.us.sentry.io/4508834839265280";

Sentry.init({
  dsn: SENTRY_DSN,

  // 10% tracing in production, full in dev. Was 1 (100%) in prod — cost + perf.
  tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1,

  // Replay disabled (was loading replayIntegration for 0% sessions).
  // Re-enable with replaysSessionSampleRate > 0 if needed.

  // Setting this option to true will print useful information to the console while you're setting up Sentry.
  debug: false,
});
