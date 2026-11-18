"use client";

import { useRef, useState } from "react";
import type { DeliveryReport } from "@maxwellcohen/delivery-core";
import { isGhost, renderGhostTicket } from "@maxwellcohen/delivery-core/render";
import { bulkCsv, type BulkRow, MAX_BULK_URLS, parseUrlList } from "@/lib/delivery/urlList";

const ms = (n: number) => `${Math.round(n)}ms`;
const bytes = (n: number) => n.toLocaleString("en-US");
const RATE_LIMIT_WAIT_MS = 10_000;
const MAX_RATE_LIMIT_RETRIES = 6;

const sleep = (ms: number, signal: AbortSignal) =>
  new Promise<void>((resolve, reject) => {
    const t = setTimeout(resolve, ms);
    signal.addEventListener("abort", () => (clearTimeout(t), reject(signal.reason)), {
      once: true,
    });
  });

/** One check via the API; on 429 waits and retries so bulk lists stay inside the rate limit. */
async function checkOne(
  params: Record<string, string>,
  signal: AbortSignal,
  onWait: () => void,
): Promise<DeliveryReport> {
  for (let attempt = 0; ; attempt++) {
    const res = await fetch(`/api/agent/delivery?${new URLSearchParams(params)}`, { signal });
    let body: (Partial<DeliveryReport> & { error?: string }) | null = null;
    try {
      body = await res.json();
    } catch {
      // Non-JSON error page from the platform (429/502/timeout).
    }
    if (res.status === 429 && attempt < MAX_RATE_LIMIT_RETRIES) {
      onWait();
      await sleep(RATE_LIMIT_WAIT_MS, signal);
      continue;
    }
    if (!res.ok || !body?.document)
      throw new Error(body?.error ?? `Check failed (HTTP ${res.status})`);
    return body as DeliveryReport;
  }
}

export default function DeliveryCheckPage() {
  const [input, setInput] = useState("");
  const [ua, setUa] = useState("googlebot");
  const [runs, setRuns] = useState("1");
  const [slowRead, setSlowRead] = useState(false);
  const [report, setReport] = useState<DeliveryReport | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<BulkRow[]>([]);
  const [selected, setSelected] = useState(-1);
  const [waiting, setWaiting] = useState(false);
  const [copied, setCopied] = useState("");
  const inflight = useRef<AbortController | null>(null);

  const run = async () => {
    inflight.current?.abort();
    const controller = new AbortController();
    inflight.current = controller;
    const { urls, dropped } = parseUrlList(input);
    const params = (url: string) => {
      const p: Record<string, string> = { url, ua, runs, format: "json" };
      if (slowRead) p.slowRead = "1";
      return p;
    };
    setLoading(true);
    setError(
      dropped ? `Only the first ${MAX_BULK_URLS} URLs are checked; ${dropped} skipped.` : "",
    );
    setReport(null);
    setRows([]);
    setSelected(-1);
    try {
      if (urls.length === 1) {
        setReport(await checkOne(params(urls[0]), controller.signal, () => {}));
        return;
      }
      const update = (i: number, patch: Partial<BulkRow>) =>
        setRows((prev) => prev.map((r, j) => (j === i ? { ...r, ...patch } : r)));
      setRows(urls.map((url) => ({ url, state: "queued" })));
      // Sequential on purpose: the route allows 10 checks a minute per client.
      for (let i = 0; i < urls.length; i++) {
        update(i, { state: "running" });
        try {
          const r = await checkOne(params(urls[i]), controller.signal, () => setWaiting(true));
          update(i, { state: "done", report: r });
        } catch (e) {
          if (controller.signal.aborted) return;
          update(i, { state: "error", error: e instanceof Error ? e.message : "Check failed" });
        } finally {
          setWaiting(false);
        }
      }
    } catch (e) {
      if (controller.signal.aborted) return;
      setError(e instanceof Error ? e.message : "Check failed");
    } finally {
      if (inflight.current === controller) {
        inflight.current = null;
        setLoading(false);
      }
    }
  };

  const stop = () => {
    inflight.current?.abort();
    inflight.current = null;
    setLoading(false);
    setWaiting(false);
    setRows((prev) =>
      prev.map((r) =>
        r.state === "running" || r.state === "queued"
          ? { ...r, state: "error", error: "Stopped" }
          : r,
      ),
    );
  };

  const downloadCsv = () => {
    const href = URL.createObjectURL(new Blob([bulkCsv(rows)], { type: "text/csv" }));
    const a = Object.assign(document.createElement("a"), { href, download: "delivery-check.csv" });
    a.click();
    URL.revokeObjectURL(href);
  };

  const copy = (key: string, text: string) => {
    void navigator.clipboard
      .writeText(text)
      .then(() => setCopied(key))
      .catch(() => setError("Could not copy; select the text and copy it manually."));
  };

  const shown = selected >= 0 ? rows[selected]?.report : report;
  const done = rows.filter((r) => r.state === "done" || r.state === "error").length;

  return (
    <main className="mx-auto flex max-w-5xl flex-col gap-6 p-4">
      <h1 className="text-xl font-semibold">Delivery check</h1>
      <p className="text-sm text-muted-foreground">
        Finds ghost errors: responses the server logs as 200 OK but that reach the client incomplete
        (HTTP/2 RST_STREAM, early socket close, proxy timeouts). Fetches the page and up to 10 of
        its scripts and styles. Paste one URL, or a list (one per line, up to {MAX_BULK_URLS}).
      </p>
      <form
        className="flex flex-col gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (input.trim()) void run();
        }}
      >
        <div className="flex items-start gap-2">
          <textarea
            className="min-h-64 flex-1 resize-y rounded-md border bg-background px-3 py-2 font-mono text-sm"
            placeholder={"https://example.com\nhttps://example.com/category"}
            aria-label="URLs to check, one per line"
            rows={Math.min(20, Math.max(10, input.split("\n").length))}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey))
                e.currentTarget.form?.requestSubmit();
            }}
          />
          {loading && rows.length > 0 ? (
            <button
              type="button"
              className="rounded-md border px-4 py-2 text-sm font-medium"
              onClick={stop}
            >
              Stop
            </button>
          ) : (
            <button className="rounded-md border px-4 py-2 text-sm font-medium" disabled={loading}>
              {loading ? "Checking…" : "Check"}
            </button>
          )}
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
      {rows.length > 0 && (
        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap items-center gap-4 text-sm">
            <span>
              {done} / {rows.length} checked
              {waiting && " (waiting for rate limit…)"}
            </span>
            <span className={rows.some((r) => r.report?.ghosts) ? "font-medium text-red-600" : ""}>
              {rows.filter((r) => r.report?.ghosts).length} with ghost responses
            </span>
            <button
              type="button"
              className="rounded-md border px-2 py-1 text-xs"
              onClick={downloadCsv}
              disabled={!done}
            >
              Download CSV
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-xs text-muted-foreground">
                <tr>
                  <th className="p-2">URL</th>
                  <th className="p-2">Status</th>
                  <th className="p-2">Ghosts</th>
                  <th className="p-2">Checked</th>
                  <th className="p-2" />
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr
                    key={r.url}
                    className={`${r.report?.ghosts ? "bg-red-500/10" : ""} ${i === selected ? "outline outline-1" : ""}`}
                  >
                    <td className="max-w-md truncate p-2" title={r.url}>
                      {r.url}
                    </td>
                    <td className="p-2">
                      {r.state === "done" ? (
                        r.report!.document.status
                      ) : r.state === "error" ? (
                        <span className="text-red-600" title={r.error}>
                          {r.error}
                        </span>
                      ) : (
                        r.state
                      )}
                    </td>
                    <td className="p-2">{r.report ? r.report.ghosts : "-"}</td>
                    <td className="p-2">{r.report ? 1 + r.report.assets.length : "-"}</td>
                    <td className="p-2">
                      {r.report && (
                        <button
                          type="button"
                          className="rounded-md border px-2 py-1 text-xs"
                          onClick={() => setSelected(i === selected ? -1 : i)}
                        >
                          {i === selected ? "Hide" : "Details"}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      {shown && <ReportView report={shown} copied={copied} copy={copy} />}
    </main>
  );
}

function ReportView({
  report,
  copied,
  copy,
}: {
  report: DeliveryReport;
  copied: string;
  copy: (key: string, text: string) => void;
}) {
  const all = [report.document, ...report.assets];
  return (
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
  );
}
