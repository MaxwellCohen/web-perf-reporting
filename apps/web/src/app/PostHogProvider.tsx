"use client";
import { useEffect, type ReactNode } from "react";

// Defer posthog-js (311kB client on every route per next-bundle-optimizer
// audit 'audit-before-1') out of the initial bundle. No static posthog
// imports here: the library is loaded via async import() after mount, so the
// initial render only contains this tiny wrapper. Analytics returns no UI,
// so rendering children immediately preserves behavior.
// Children are never re-parented: swapping in a context provider after load remounted the
// whole page and wiped client state (e.g. a file chosen right after page load). Nothing in
// the app reads the PostHog React context, so we only initialise the client.
export function PostHogProvider({ children }: { children: ReactNode }) {
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const { default: posthog } = await import("posthog-js");
      const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
      if (key && !cancelled) {
        posthog.init(key, {
          api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST,
          person_profiles: "identified_only",
          capture_pageview: false,
          disable_surveys: true,
          // Cookieless: keep identifiers in memory only, so no consent banner is needed.
          persistence: "memory",
          disable_session_recording: true,
        });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return <>{children}</>;
}
