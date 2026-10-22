"use client";

import { useEffect, useState } from "react";

export type CruxJobSlot = {
  key: string;
  status: "pending" | "ready" | "failed";
  report?: unknown;
  reports?: unknown[];
  error?: string;
};

export type CruxJobSnapshot = {
  jobId: string;
  pageUrl: string;
  kind: "current" | "history";
  slots: CruxJobSlot[];
};

const POLL_INTERVAL_MS = 2000;
const POLL_TIMEOUT_MS = 120_000;

export function useCruxJob(kind: "current" | "history", pageUrl: string) {
  const [snapshot, setSnapshot] = useState<CruxJobSnapshot | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();

    async function load() {
      const started = await fetch(`/api/crux/${kind}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ url: pageUrl }),
        signal: controller.signal,
      });
      if (!started.ok) throw new Error("Could not start the CrUX lookup");
      let job = (await started.json()) as CruxJobSnapshot;
      const deadline = Date.now() + POLL_TIMEOUT_MS;

      while (!cancelled) {
        setSnapshot(job);
        if (!job.slots.some((slot) => slot.status === "pending") || Date.now() >= deadline) break;
        await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
        if (cancelled) return;
        const next = await fetch(`/api/crux/${kind}?jobId=${encodeURIComponent(job.jobId)}`, {
          signal: controller.signal,
        });
        if (!next.ok) throw new Error("Could not load the CrUX lookup");
        job = (await next.json()) as CruxJobSnapshot;
      }
    }

    load().catch((err: unknown) => {
      if (cancelled || (err instanceof DOMException && err.name === "AbortError")) return;
      setError(err instanceof Error ? err.message : "Could not load CrUX data");
    });

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [kind, pageUrl]);

  return { snapshot, error };
}
