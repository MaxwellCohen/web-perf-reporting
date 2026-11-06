import http from "node:http";
import https from "node:https";
import { appendChunk, isLateChunk, LATE_TAIL_CHARS, makePreview, normalizeMeasurement } from "./analyze";
import type { StreamChunk, StreamMeasurement } from "./types";
import { assertPublicHttpUrl, guardedLookup } from "./urlGuard";

const MAX_BYTES = 5 * 1024 * 1024;
const TIMEOUT_MS = 20_000;
const MAX_REDIRECTS = 5;
/** A slow redirect chain still leaves the final response at least this long. */
const MIN_HOP_MS = 5000;

/** Time left for one hop: at least MIN_HOP_MS, but never past deadline + MIN_HOP_MS overall. */
const hopBudget = (deadline: number) =>
  Math.max(1, Math.min(Math.max(MIN_HOP_MS, deadline - Date.now()), deadline + MIN_HOP_MS - Date.now()));

type Hop = { res: http.IncomingMessage; start: number };

function request(url: URL, deadline: number): Promise<Hop> {
  return new Promise((resolve, reject) => {
    const lib = url.protocol === "https:" ? https : http;
    const start = performance.now();
    let timer: ReturnType<typeof setTimeout> | undefined;
    const req = lib.request(
      url,
      {
        method: "GET",
        // Fresh connection every time (no keep-alive reuse): timings include DNS/TCP/TLS and every connect is guarded.
        agent: false,
        lookup: guardedLookup as never,
        // Identity keeps chunk boundaries and previews readable and avoids decompression buffering.
        headers: { accept: "text/html,*/*", "accept-encoding": "identity", "user-agent": "web-perf-report-stream/1.0" },
      },
      (res) => (clearTimeout(timer), resolve({ res, start })),
    );
    // Overall deadline (not an idle timeout): a header-dripping or stalled host cannot hold the slot past it.
    timer = setTimeout(() => req.destroy(new Error(`Request timed out (${TIMEOUT_MS / 1000}s limit)`)), hopBudget(deadline));
    req.on("error", (e) => (clearTimeout(timer), reject(e)));
    req.end();
  });
}

/** Fetch a page and record when each body chunk arrives. Server-side only (guards against private hosts). */
export async function measureStream(rawUrl: string): Promise<StreamMeasurement> {
  let url = assertPublicHttpUrl(rawUrl);
  const deadline = Date.now() + TIMEOUT_MS;
  let hop = await request(url, deadline);
  let redirects = 0;
  for (;;) {
    const { statusCode = 0, headers } = hop.res;
    if (statusCode < 300 || statusCode >= 400 || !headers.location) break;
    hop.res.destroy();
    if (++redirects > MAX_REDIRECTS) throw new Error(`Too many redirects (more than ${MAX_REDIRECTS})`);
    url = assertPublicHttpUrl(new URL(headers.location, url).href);
    hop = await request(url, deadline);
  }

  // Timings are relative to the request that produced the measured response, not earlier redirect hops.
  const { res, start } = hop;
  const headersMs = performance.now() - start;
  const startedAt = new Date(Date.now() - headersMs).toISOString();
  const chunks: StreamChunk[] = [];
  const decoder = new TextDecoder();
  // Previews and marker detection need readable text: skip them for compressed or non-text bodies.
  const encoded = !!res.headers["content-encoding"] && res.headers["content-encoding"] !== "identity";
  const textual = !encoded && /^(text\/|application\/(xhtml|xml|json))/i.test(res.headers["content-type"] ?? "text/html");
  let tail = "";
  let total = 0;
  let truncated = false;

  await new Promise<void>((resolve, reject) => {
    const timer = setTimeout(() => res.destroy(new Error(`Response timed out (${TIMEOUT_MS / 1000}s limit)`)), hopBudget(deadline));
    res.on("data", (value: Buffer) => {
      if (truncated) return;
      const t = performance.now() - start;
      const text = textual ? decoder.decode(value, { stream: true }) : "";
      appendChunk(chunks, { t, bytes: value.byteLength, preview: textual ? makePreview(text) : undefined, late: (textual && isLateChunk(text, tail)) || undefined });
      tail = (tail + text).slice(-LATE_TAIL_CHARS);
      total += value.byteLength;
      if (total > MAX_BYTES) {
        truncated = true;
        res.destroy();
      }
    });
    res.on("end", () => (clearTimeout(timer), resolve()));
    res.on("close", () => {
      clearTimeout(timer);
      if (res.complete || truncated) resolve();
      else reject(new Error("Connection closed before the response finished"));
    });
    res.on("error", (e) => (clearTimeout(timer), truncated ? resolve() : reject(e)));
  });

  const totalMs = performance.now() - start;
  return normalizeMeasurement({
    url: rawUrl,
    finalUrl: url.href,
    status: res.statusCode ?? 0,
    contentType: res.headers["content-type"],
    contentEncoding: res.headers["content-encoding"],
    measuredFrom: "server",
    startedAt,
    headersMs,
    totalMs,
    chunks,
    lastByteMs: chunks[chunks.length - 1]?.end ?? chunks[chunks.length - 1]?.t,
    redirects: redirects || undefined,
    truncated: truncated || undefined,
  });
}
