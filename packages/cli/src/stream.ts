import type { Format } from "./core.js";
import { assertHttpUrl, DEFAULT_API } from "./core.js";

const MAX_BYTES = 5_000_000;
const MAX_REDIRECTS = 5;
const TIMEOUT_MS = 30_000;
const COALESCE_MS = 5;
const MAX_LIVE_CHUNKS = 20_000;
// Keep in sync with LATE_MARKER_SOURCE / LATE_TAIL_CHARS in apps/web/src/lib/stream-timing/analyze.ts.
const LATE_MARKER = String.raw`\$R[CSXB]\(|<div hidden id="S:`;
const LATE_TAIL_CHARS = 17;

interface Chunk {
  t: number;
  end?: number;
  bytes: number;
  preview?: string;
  late?: true;
}

export interface StreamMeasurement {
  url: string;
  finalUrl: string;
  status: number;
  startedAt: string;
  headersMs: number;
  totalMs: number;
  measuredFrom: "local";
  chunks: Chunk[];
  lastByteMs?: number;
  redirects?: number;
  truncated?: true;
  contentType?: string;
  contentEncoding?: string;
}

function isLate(tail: string, text: string): boolean {
  const re = new RegExp(LATE_MARKER, "g");
  const all = tail + text;
  for (let m = re.exec(all); m; m = re.exec(all)) if (m.index + m[0].length > tail.length) return true;
  return false;
}

const endOf = (c: Chunk) => c.end ?? c.t;
const preview = (text: string) => text.replace(/\s+/g, " ").trim().slice(0, 80);

/** Fetch a page (localhost works) and record when each chunk of the body arrives. */
export async function measureStream(rawUrl: string): Promise<StreamMeasurement> {
  let target = assertHttpUrl(rawUrl);
  const signal = AbortSignal.timeout(TIMEOUT_MS);
  let redirects = 0;
  let t0 = performance.now();
  let res: Response;
  // Follow redirects by hand so timings cover only the final response.
  for (;;) {
    t0 = performance.now();
    res = await fetch(target, {
      headers: { accept: "text/html,*/*", "accept-encoding": "identity" },
      cache: "no-store",
      redirect: "manual",
      signal,
    });
    const loc = res.headers.get("location");
    if (res.status >= 300 && res.status < 400 && loc) {
      await res.body?.cancel();
      if (++redirects > MAX_REDIRECTS) throw new Error("Too many redirects");
      target = assertHttpUrl(new URL(loc, target).href);
      continue;
    }
    break;
  }
  if (!res.body) throw new Error(`No response body (HTTP ${res.status})`);

  const headersMs = performance.now() - t0;
  const startedAt = new Date(Date.now() - headersMs).toISOString();
  const ce = res.headers.get("content-encoding");
  const textual =
    (!ce || ce === "identity") && /^(text\/|application\/(xhtml|xml|json))/i.test(res.headers.get("content-type") ?? "text/html");
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  const chunks: Chunk[] = [];
  let tail = "";
  let total = 0;
  let truncated = false;
  for (;;) {
    const r = await reader.read();
    if (r.done) break;
    const t = performance.now() - t0;
    const text = textual ? decoder.decode(r.value, { stream: true }) : "";
    const late = isLate(tail, text);
    const head = chunks[chunks.length - 1];
    if (head && (t - endOf(head) < COALESCE_MS || (chunks.length >= MAX_LIVE_CHUNKS && t - endOf(head) < 100))) {
      head.bytes += r.value.byteLength;
      head.end = t;
      if (late && !head.late) head.preview = preview(text);
      if (late) head.late = true;
    } else {
      chunks.push({ t, bytes: r.value.byteLength, preview: textual ? preview(text) : undefined, late: late || undefined });
    }
    tail = (tail + text).slice(-LATE_TAIL_CHARS);
    total += r.value.byteLength;
    if (total > MAX_BYTES) {
      truncated = true;
      await reader.cancel();
      break;
    }
  }
  // Keep previews only where they matter (first, late, after a gap) so the upload stays small.
  chunks.forEach((c, i) => {
    const prev = chunks[i - 1];
    if (i > 0 && !c.late && !(prev && c.t - endOf(prev) >= 100)) delete c.preview;
  });
  const last = chunks[chunks.length - 1];
  return {
    url: rawUrl,
    finalUrl: target,
    status: res.status,
    startedAt,
    headersMs,
    totalMs: performance.now() - t0,
    measuredFrom: "local",
    chunks,
    lastByteMs: last ? endOf(last) : undefined,
    redirects: redirects || undefined,
    truncated: truncated || undefined,
    contentType: res.headers.get("content-type") ?? undefined,
    contentEncoding: ce ?? undefined,
  };
}

export async function postStreamMeasurement(
  measurement: StreamMeasurement,
  opts: { apiBase?: string; format?: Format } = {},
): Promise<string> {
  const base = (opts.apiBase || process.env.WEB_PERF_REPORT_API || DEFAULT_API).replace(/\/+$/, "");
  let res: Response;
  let text: string;
  try {
    res = await fetch(`${base}/api/agent/stream?format=${opts.format ?? "md"}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ measurement }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    text = await res.text();
  } catch (e) {
    const reason = e instanceof Error && e.name === "TimeoutError" ? `timed out after ${TIMEOUT_MS / 1000}s` : String(e instanceof Error ? e.message : e);
    throw new Error(`Could not reach the stream API at ${base}: ${reason}`);
  }
  if (!res.ok) throw new Error(`Stream API returned ${res.status}: ${text.slice(0, 500)}`);
  return text;
}

/** Measure chunk arrival times locally, then have the API analyze them and return a report with a share link. */
export async function runStream(opts: {
  url: string;
  apiBase?: string;
  format?: Format;
  onProgress?: (message: string) => void;
}): Promise<string> {
  opts.onProgress?.(`Measuring ${opts.url}...`);
  const measurement = await measureStream(opts.url);
  opts.onProgress?.("Analyzing timings...");
  return postStreamMeasurement(measurement, { apiBase: opts.apiBase, format: opts.format });
}
