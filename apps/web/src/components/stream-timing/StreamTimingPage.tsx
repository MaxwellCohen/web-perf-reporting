"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { analyze } from "@/lib/stream-timing/analyze";
import { decodeMeasurement } from "@/lib/stream-timing/share";
import type { StreamMeasurement } from "@/lib/stream-timing/types";
import { StreamTimeline } from "./StreamTimeline";

function shellQuote(value: string): string {
  return /^[\w@%+=:,./-]+$/.test(value) ? value : `'${value.replace(/'/g, `'\\''`)}'`;
}

const ms = (n: number) => `${Math.round(n)}ms`;

function readHash(): StreamMeasurement | null {
  const m = /^#r=(.+)$/.exec(window.location.hash);
  return m ? decodeMeasurement(m[1]) : null;
}

export default function StreamTimingPage() {
  const [measurement, setMeasurement] = useState<StreamMeasurement | null>(null);
  const [url, setUrl] = useState("");
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
    setError("");
  };

  const run = useCallback(async (target: string) => {
    inflight.current?.abort();
    const controller = new AbortController();
    inflight.current = controller;
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/agent/stream?url=${encodeURIComponent(target)}`, { signal: controller.signal });
      const raw = await res.text();
      let body: { error?: string; measurement?: StreamMeasurement; shareUrl?: string } = {};
      try {
        body = JSON.parse(raw);
      } catch {
        // Non-JSON error page from the platform (429/502/timeout).
      }
      if (!res.ok || !body.measurement || !body.shareUrl) {
        throw new Error(body.error ?? `Measurement failed (HTTP ${res.status})`);
      }
      setMeasurement(body.measurement);
      setFromLink(false);
      setUrl(body.measurement.url);
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
        return;
      }
      setMeasurement(fromHash);
      setFromLink(true);
      setUrl(fromHash.url);
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
  const runCommand = `curl -s ${origin || "<this site>"}/measure-stream.mjs | node - ${shellQuote(url.trim() || "http://localhost:3000")}`;

  return (
    <main className="mx-auto flex max-w-5xl flex-col gap-6 p-4">
      <h1 className="text-xl font-semibold">Streaming timing</h1>
      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (url.trim()) void run(url.trim());
        }}
      >
        <input
          className="flex-1 rounded-md border bg-background px-3 py-2 text-sm"
          placeholder="https://example.com"
          value={url}
          onChange={(e) => {
            setUrl(e.target.value);
            setCmdCopied(false);
          }}
        />
        <button className="rounded-md border px-4 py-2 text-sm font-medium" disabled={loading}>
          {loading ? "Measuring…" : "Measure"}
        </button>
      </form>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="flex flex-col gap-1">
        <p className="text-xs text-muted-foreground">
          Or run it from your terminal (needed for localhost). The URL above is added to the end; edit it to change the page.
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
              {measurement.finalUrl ?? measurement.url}{fromLink ? "" : ` · measured from ${measurement.measuredFrom}`}
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
          <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              ["TTFB", ms(a.ttfbMs)],
              ["Last byte", ms(a.lastByteMs)],
              ["Idle waiting", `${ms(a.idleMs)} (${a.idlePct}%)`],
              ["Chunks", `${a.chunkCount} · ${(a.totalBytes / 1024).toFixed(1)} KB`],
            ].map(([k, v]) => (
              <div key={k} className="rounded-md border p-3">
                <dt className="text-xs text-muted-foreground">{k}</dt>
                <dd className="text-lg font-semibold">{v}</dd>
              </div>
            ))}
          </dl>
          <StreamTimeline measurement={measurement} analysis={a} />
          {!a.streamed && (
            <p className="text-sm text-muted-foreground">
              Not streamed: the body arrived in one burst (or a proxy/compression buffered it).
            </p>
          )}
          <table className="w-full text-left text-sm">
            <thead className="text-xs text-muted-foreground">
              <tr>
                <th className="py-1 pr-3">#</th>
                <th className="pr-3">Arrived</th>
                <th className="pr-3">Since previous</th>
                <th className="pr-3">Size</th>
                <th>Content</th>
              </tr>
            </thead>
            <tbody>
              {measurement.chunks.map((c, i) => {
                const prev = measurement.chunks[i - 1];
                const delta = i === 0 ? c.t : c.t - (prev.end ?? prev.t);
                const slow = delta >= a.gapThresholdMs;
                return (
                  <tr key={i} className="border-t align-top">
                    <td className="py-1.5 pr-3 text-muted-foreground">{i + 1}</td>
                    <td className="pr-3 font-medium tabular-nums">{c.end ? `${ms(c.t)}–${ms(c.end)}` : ms(c.t)}</td>
                    <td className={`pr-3 tabular-nums ${slow ? "font-semibold text-amber-500" : "text-muted-foreground"}`}>
                      +{ms(delta)}
                    </td>
                    <td className="pr-3 tabular-nums">{(c.bytes / 1024).toFixed(1)} KB</td>
                    <td className="break-all">
                      {c.late && <span className="mr-2 rounded bg-orange-600/20 px-1.5 py-0.5 text-xs text-orange-500">Suspense</span>}
                      {c.preview && <code className="text-xs">{c.preview}</code>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {a.gaps.length > 0 && (
            <ul className="flex flex-col gap-2 text-sm">
              {a.gaps.map((g) => (
                <li key={g.beforeIndex} className="rounded-md border border-amber-500/50 bg-amber-500/10 p-3">
                  <strong>
                    Waited {ms(g.durationMs)}
                  </strong>{" "}
                  ({ms(g.fromMs)} → {ms(g.toMs)})
                  {g.next && (
                    <>
                      , then received <code className="break-all">{g.next}</code>
                    </>
                  )}
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </main>
  );
}
