"use client";

import { useRef, useState } from "react";
import type { DeliveryReport } from "@maxwellcohen/delivery-core";
import { isGhost, renderGhostTicket } from "@maxwellcohen/delivery-core/render";

const ms = (n: number) => `${Math.round(n)}ms`;
const bytes = (n: number) => n.toLocaleString("en-US");

export default function DeliveryCheckPage() {
  const [url, setUrl] = useState("");
  const [ua, setUa] = useState("googlebot");
  const [runs, setRuns] = useState("1");
  const [slowRead, setSlowRead] = useState(false);
  const [report, setReport] = useState<DeliveryReport | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState("");
  const inflight = useRef<AbortController | null>(null);

  const run = async () => {
    inflight.current?.abort();
    const controller = new AbortController();
    inflight.current = controller;
    setLoading(true);
    setError("");
    try {
      const query = new URLSearchParams({ url: url.trim(), ua, runs, format: "json" });
      if (slowRead) query.set("slowRead", "1");
      const res = await fetch(`/api/agent/delivery?${query}`, { signal: controller.signal });
      let body: (Partial<DeliveryReport> & { error?: string }) | null = null;
      try {
        body = await res.json();
      } catch {
        // Non-JSON error page from the platform (429/502/timeout).
      }
      if (!res.ok || !body?.document)
        throw new Error(body?.error ?? `Check failed (HTTP ${res.status})`);
      setReport(body as DeliveryReport);
    } catch (e) {
      if (controller.signal.aborted) return;
      setReport(null);
      setError(e instanceof Error ? e.message : "Check failed");
    } finally {
      if (inflight.current === controller) {
        inflight.current = null;
        setLoading(false);
      }
    }
  };

  const copy = (key: string, text: string) => {
    void navigator.clipboard
      .writeText(text)
      .then(() => setCopied(key))
      .catch(() => setError("Could not copy; select the text and copy it manually."));
  };

  const all = report ? [report.document, ...report.assets] : [];

  return (
    <main className="mx-auto flex max-w-5xl flex-col gap-6 p-4">
      <h1 className="text-xl font-semibold">Delivery check</h1>
      <p className="text-sm text-muted-foreground">
        Finds ghost errors: responses the server logs as 200 OK but that reach the client incomplete
        (HTTP/2 RST_STREAM, early socket close, proxy timeouts). Fetches the page and up to 10 of
        its scripts and styles.
      </p>
      <form
        className="flex flex-col gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (url.trim()) void run();
        }}
      >
        <div className="flex gap-2">
          <input
            className="flex-1 rounded-md border bg-background px-3 py-2 text-sm"
            placeholder="https://example.com"
            aria-label="URL to check"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
          />
          <button className="rounded-md border px-4 py-2 text-sm font-medium" disabled={loading}>
            {loading ? "Checking…" : "Check"}
          </button>
        </div>
        <div className="flex flex-wrap items-center gap-4 text-sm">
          <label className="flex items-center gap-2">
            User agent
            <select
              className="rounded-md border bg-background px-2 py-1"
              value={ua}
              onChange={(e) => setUa(e.target.value)}
            >
              <option value="googlebot">Googlebot smartphone</option>
              <option value="chrome">Chrome</option>
            </select>
          </label>
          <label className="flex items-center gap-2">
            Runs
            <select
              className="rounded-md border bg-background px-2 py-1"
              value={runs}
              onChange={(e) => setRuns(e.target.value)}
            >
              {[1, 2, 3].map((n) => (
                <option key={n}>{n}</option>
              ))}
            </select>
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={slowRead}
              onChange={(e) => setSlowRead(e.target.checked)}
            />
            Slow read (so server write timeouts can fire)
          </label>
        </div>
      </form>
      {error && <p className="text-sm text-red-600">{error}</p>}
      {report && (
        <>
          <p className={`text-sm font-medium ${report.ghosts ? "text-red-600" : ""}`}>
            {report.ghosts
              ? `${report.ghosts} ghost response${report.ghosts > 1 ? "s" : ""}: 2xx status but an incomplete body (of ${all.length} checked).`
              : `No ghost responses found (${all.length} checked).`}
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-xs text-muted-foreground">
                <tr>
                  <th className="p-2">Resource</th>
                  <th className="p-2">Proto</th>
                  <th className="p-2">Status</th>
                  <th className="p-2">Received / expected</th>
                  <th className="p-2">End</th>
                  <th className="p-2">Check</th>
                  <th className="p-2">DNS</th>
                  <th className="p-2">TCP</th>
                  <th className="p-2">TLS</th>
                  <th className="p-2">TTFB</th>
                  <th className="p-2">Total</th>
                  <th className="p-2" />
                </tr>
              </thead>
              <tbody>
                {all.map((r) => (
                  <tr key={r.url} className={isGhost(r) ? "bg-red-500/10" : ""}>
                    <td className="max-w-xs truncate p-2" title={r.url}>
                      {isGhost(r) && <strong className="text-red-600">GHOST </strong>}
                      {r.url}
                    </td>
                    <td className="p-2">{r.protocol}</td>
                    <td className="p-2">{r.status || "-"}</td>
                    <td className="p-2">
                      {bytes(r.receivedBytes)} /{" "}
                      {r.declaredBytes === undefined ? "?" : bytes(r.declaredBytes)}
                    </td>
                    <td className="p-2">
                      {r.end.kind}
                      {r.end.code !== undefined ? ` ${r.end.code}` : ""} @ {ms(r.end.atMs)}
                    </td>
                    <td className="p-2">{r.check}</td>
                    <td className="p-2">{ms(r.timings.dnsMs)}</td>
                    <td className="p-2">{ms(r.timings.tcpMs)}</td>
                    <td className="p-2">{ms(r.timings.tlsMs)}</td>
                    <td className="p-2">{ms(r.timings.ttfbMs)}</td>
                    <td className="p-2">{ms(r.timings.totalMs)}</td>
                    <td className="p-2">
                      {isGhost(r) && (
                        <button
                          className="rounded-md border px-2 py-1 text-xs"
                          onClick={() => copy(r.url, renderGhostTicket(report, r))}
                        >
                          {copied === r.url ? "Copied" : "Copy ticket"}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-muted-foreground">
            Connection timings are 0 when an HTTP/2 connection was reused.
          </p>
          {report.notChecked.length > 0 && (
            <div className="text-sm">
              <h2 className="font-semibold">Not checked</h2>
              <ul className="list-disc pl-5 text-muted-foreground">
                {report.notChecked.map((n) => (
                  <li key={n} className="break-all">
                    {n}
                  </li>
                ))}
              </ul>
            </div>
          )}
          <p className="text-xs text-muted-foreground">
            Limitation: measured from this site&apos;s server, not from Google&apos;s Web Rendering
            Service; a ghost seen by Googlebot may not reproduce here.
          </p>
        </>
      )}
    </main>
  );
}
