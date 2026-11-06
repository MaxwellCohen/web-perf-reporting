"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { analyze } from "@/lib/stream-timing/analyze";
import { decodeMeasurement } from "@/lib/stream-timing/share";
import type { StreamMeasurement } from "@/lib/stream-timing/types";
import { CompareTable } from "./CompareTable";
import { StreamResult } from "./StreamResult";

function shellQuote(value: string): string {
  return /^[\w@%+=:,./-]+$/.test(value) ? value : `'${value.replace(/'/g, `'\\''`)}'`;
}

function readHash(): { a: StreamMeasurement; b: StreamMeasurement | null } | null {
  const m = /^#r=([^&]+)(?:&b=(.+))?$/.exec(window.location.hash);
  const a = m ? decodeMeasurement(m[1]) : null;
  if (!m || !a) return null;
  return { a, b: m[2] ? decodeMeasurement(m[2]) : null };
}

export default function StreamTimingPage() {
  const [measurement, setMeasurement] = useState<StreamMeasurement | null>(null);
  const [measurement2, setMeasurement2] = useState<StreamMeasurement | null>(null);
  const [url, setUrl] = useState("");
  const [url2, setUrl2] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [origin, setOrigin] = useState("");
  const [cmdCopied, setCmdCopied] = useState(false);
  const [fromLink, setFromLink] = useState(false);

  const inflight = useRef<AbortController | null>(null);
  const pushed = useRef(false);

  const goBack = () => {
    if (pushed.current) {
      pushed.current = false;
      window.history.back();
      return;
    }
    window.history.pushState(null, "", window.location.pathname);
    setMeasurement(null);
    setMeasurement2(null);
    setError("");
  };

  const run = useCallback(async (target: string, compareTarget?: string) => {
    inflight.current?.abort();
    const controller = new AbortController();
    inflight.current = controller;
    setLoading(true);
    setError("");
    try {
      const query = `url=${encodeURIComponent(target)}${compareTarget ? `&compare=${encodeURIComponent(compareTarget)}` : ""}`;
      const res = await fetch(`/api/agent/stream?${query}`, { signal: controller.signal });
      const raw = await res.text();
      let body: {
        error?: string;
        measurement?: StreamMeasurement;
        a?: { measurement: StreamMeasurement };
        b?: { measurement: StreamMeasurement };
        shareUrl?: string;
      } = {};
      try {
        body = JSON.parse(raw);
      } catch {
        // Non-JSON error page from the platform (429/502/timeout).
      }
      const first = body.measurement ?? body.a?.measurement;
      if (!res.ok || !first || !body.shareUrl) {
        throw new Error(body.error ?? `Measurement failed (HTTP ${res.status})`);
      }
      setMeasurement(first);
      setMeasurement2(body.b?.measurement ?? null);
      setFromLink(false);
      setUrl(first.url);
      setUrl2(body.b?.measurement.url ?? "");
      setCopied(false);
      // push (not replace) so the browser Back button returns to the previous view
      window.history.pushState(null, "", body.shareUrl.replace(/^https?:\/\/[^/]+/, ""));
      pushed.current = true;
    } catch (e) {
      if (controller.signal.aborted) return;
      setError(e instanceof Error ? e.message : "Measurement failed");
    } finally {
      if (inflight.current === controller) {
        inflight.current = null;
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    const syncFromHash = () => {
      const fromHash = readHash();
      // Navigating by hash supersedes any run still in flight.
      inflight.current?.abort();
      inflight.current = null;
      setLoading(false);
      setError("");
      if (!fromHash) {
        // Hash cleared or invalid (back/forward, manual edit): don't leave stale data under a different URL.
        setMeasurement(null);
        setMeasurement2(null);
        return;
      }
      setMeasurement(fromHash.a);
      setMeasurement2(fromHash.b);
      setFromLink(true);
      setUrl(fromHash.a.url);
      setUrl2(fromHash.b?.url ?? "");
      setCopied(false);
    };
    setOrigin(window.location.origin);
    syncFromHash();
    // A ?url= link only prefills the input; measuring needs an explicit click so links can't trigger fetches.
    const q = new URLSearchParams(window.location.search).get("url");
    if (q && !readHash()) setUrl(q);
    window.addEventListener("hashchange", syncFromHash);
    return () => window.removeEventListener("hashchange", syncFromHash);
  }, []);

  const a = measurement ? analyze(measurement) : null;
  const b = measurement2 ? analyze(measurement2) : null;
  const axisEnd = a && b ? Math.max(a.lastByteMs, b.lastByteMs, measurement?.totalMs ?? 0, measurement2?.totalMs ?? 0) : undefined;
  const runCommand = `npx -y @maxwellcohen/web-perf-report stream ${shellQuote(url.trim() || "http://localhost:3000")}${url2.trim() ? ` ${shellQuote(url2.trim())}` : ""}`;

  return (
    <main className="mx-auto flex max-w-5xl flex-col gap-6 p-4">
      <h1 className="text-xl font-semibold">Streaming timing</h1>
      <form
        className="flex flex-col gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (url.trim()) void run(url.trim(), url2.trim() || undefined);
        }}
      >
        <div className="flex gap-2">
          <input
            className="flex-1 rounded-md border bg-background px-3 py-2 text-sm"
            placeholder="https://example.com"
            aria-label="URL to measure"
            value={url}
            onChange={(e) => {
              setUrl(e.target.value);
              setCmdCopied(false);
            }}
          />
          <button className="rounded-md border px-4 py-2 text-sm font-medium" disabled={loading}>
            {loading ? "Measuring…" : url2.trim() ? "Compare" : "Measure"}
          </button>
        </div>
        <input
          className="rounded-md border bg-background px-3 py-2 text-sm"
          placeholder="Compare with another URL (optional)"
          aria-label="URL to compare against"
          value={url2}
          onChange={(e) => {
            setUrl2(e.target.value);
            setCmdCopied(false);
          }}
        />
      </form>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="flex flex-col gap-1">
        <p className="text-xs text-muted-foreground">
          Or run it from your terminal with the CLI (needed for localhost). The URL(s) above are added to the end; edit them to change the page.
        </p>
        <div className="flex items-center gap-2">
          <code className="flex-1 overflow-x-auto whitespace-nowrap rounded-md border bg-muted px-3 py-2 text-xs">
            {runCommand}
          </code>
          <button
            type="button"
            className="rounded-md border px-3 py-1 text-xs"
            onClick={() => {
              void navigator.clipboard
                .writeText(runCommand)
                .then(() => setCmdCopied(true))
                .catch(() => setError("Could not copy; select the command and copy it manually."));
            }}
          >
            {cmdCopied ? "Copied" : "Copy command"}
          </button>
        </div>
      </div>
      {measurement && a && (
        <>
          {fromLink && (
            <p className="text-xs text-muted-foreground">
              Snapshot from a link: timings are as recorded by whoever created it, not verified by this site.
            </p>
          )}
          <div className="flex items-center justify-between gap-2">
            <button className="rounded-md border px-3 py-1 text-xs" onClick={goBack}>
              ← Back
            </button>
            <p className="truncate text-sm text-muted-foreground">
              {measurement2 ? "Comparison" : (measurement.finalUrl ?? measurement.url)}{fromLink ? "" : ` · measured from ${measurement.measuredFrom}`}
            </p>
            <button
              className="rounded-md border px-3 py-1 text-xs"
              onClick={() => {
                void navigator.clipboard
                  .writeText(window.location.href)
                  .then(() => setCopied(true))
                  .catch(() => setError("Could not copy; copy the address bar URL instead."));
              }}
            >
              {copied ? "Copied" : "Copy share link"}
            </button>
          </div>
          {b && measurement2 ? (
            <>
              <CompareTable a={a} b={b} />
              <StreamResult label="A" measurement={measurement} analysis={a} axisEnd={axisEnd} />
              <StreamResult label="B" measurement={measurement2} analysis={b} axisEnd={axisEnd} />
            </>
          ) : (
            <StreamResult measurement={measurement} analysis={a} />
          )}
        </>
      )}
    </main>
  );
}
