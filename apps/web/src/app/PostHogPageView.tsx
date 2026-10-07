// app/PostHogPageView.jsx
"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useEffect } from "react";

export default function PostHogPageView() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Track pageviews. Dynamic import keeps posthog-js out of the initial
  // client bundle; pageview capture is fire-and-forget after hydration.
  useEffect(() => {
    if (!pathname) return;
    let url = window.origin + pathname;
    const query = searchParams.toString();
    if (query) {
      url = `${url}?${query}`;
    }

    void import("posthog-js").then(({ default: posthog }) => {
      posthog.capture("$pageview", { $current_url: url });
    });
  }, [pathname, searchParams]);

  return null;
}
