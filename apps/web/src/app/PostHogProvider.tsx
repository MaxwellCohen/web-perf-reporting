"use client";
import { useEffect, useState, type ComponentType, type ReactNode } from "react";

// Defer posthog-js (311kB client on every route per next-bundle-optimizer
// audit 'audit-before-1') out of the initial bundle. No static posthog
// imports here: the library is loaded via async import() after mount, so the
// initial render only contains this tiny wrapper. Analytics returns no UI,
// so rendering children immediately preserves behavior.
export function PostHogProvider({ children }: { children: ReactNode }) {
  const [Provider, setProvider] = useState<ComponentType<{
    client: unknown;
    children: ReactNode;
  }> | null>(null);
  const [client, setClient] = useState<unknown>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const [{ default: posthog }, { PostHogProvider: PHProvider }] = await Promise.all([
        import("posthog-js"),
        import("posthog-js/react"),
      ]);
      const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
      if (key) {
        posthog.init(key, {
          api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST,
          person_profiles: "identified_only",
          capture_pageview: false,
        });
      }
      if (!cancelled) {
        setClient(posthog);
        setProvider(() => PHProvider as ComponentType<{ client: unknown; children: ReactNode }>);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (!Provider || !client) return <>{children}</>;
  return <Provider client={client}>{children}</Provider>;
}
