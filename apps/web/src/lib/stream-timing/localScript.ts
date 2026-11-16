import { LATE_MARKER_SOURCE, LATE_TAIL_CHARS } from "./analyze";

/** Dependency-free Node script for measuring localhost; served at /measure-stream.mjs. Runs under `node -` (CommonJS stdin) on Node 18+. */
export const buildLocalScript = (siteUrl: string) => String.raw`#!/usr/bin/env node
// Measures when each chunk of a page's HTML arrives, then sends it for analysis.
// Usage: curl -s ${siteUrl}/measure-stream.mjs | node - http://localhost:3000 [--json]
// Works on localhost; needs Node 18+. Audit a production build (next build && next start).
(async () => {
  const args = process.argv.slice(2);
  const url = args.find((a) => !a.startsWith("--"));
  const json = args.includes("--json");
  const api = process.env.WEB_PERF_API || ${JSON.stringify(`${siteUrl}/api/agent/stream`)};
  if (!url) {
    console.error("usage: node measure-stream.mjs <url> [--json]");
    process.exit(2);
  }
  const LATE_SRC = ${JSON.stringify(LATE_MARKER_SOURCE)};
  function late(tail, text) {
    const re = new RegExp(LATE_SRC, "g");
    const all = tail + text;
    for (let m = re.exec(all); m; m = re.exec(all)) if (m.index + m[0].length > tail.length) return true;
    return false;
  }
  const signal = AbortSignal.timeout(30000);
  // Follow redirects by hand so the measured timings cover only the final response.
  let target = url;
  let redirects = 0;
  let t0 = performance.now();
  let res;
  for (;;) {
    t0 = performance.now();
    res = await fetch(target, { headers: { accept: "text/html,*/*", "accept-encoding": "identity" }, cache: "no-store", redirect: "manual", signal: signal });
    const loc = res.headers.get("location");
    if (res.status >= 300 && res.status < 400 && loc) {
      if (res.body) await res.body.cancel();
      if (++redirects > 5) throw new Error("Too many redirects");
      target = new URL(loc, target).href;
      continue;
    }
    break;
  }
  const headersMs = performance.now() - t0;
  // Previews and marker detection need readable text: skip them for compressed or non-text bodies.
  const ce = res.headers.get("content-encoding");
  const textual = (!ce || ce === "identity") && /^(text\/|application\/(xhtml|xml|json))/i.test(res.headers.get("content-type") || "text/html");
  const startedAt = new Date(Date.now() - headersMs).toISOString();
  const chunks = [];
  const dec = new TextDecoder();
  if (!res.body) throw new Error("No response body (HTTP " + res.status + ")");
  const reader = res.body.getReader();
  let tail = "";
  let total = 0;
  let truncated = false;
  for (;;) {
    const r = await reader.read();
    if (r.done) break;
    const t = performance.now() - t0;
    const text = textual ? dec.decode(r.value, { stream: true }) : "";
    const isLate = late(tail, text);
    const head = chunks[chunks.length - 1];
    if (head && (t - (head.end === undefined ? head.t : head.end) < 5 || (chunks.length >= 20000 && t - (head.end === undefined ? head.t : head.end) < 100))) {
      head.bytes += r.value.byteLength;
      head.end = t;
      if (isLate && !head.late) head.preview = text.replace(/\s+/g, " ").trim().slice(0, 80);
      head.late = head.late || isLate || undefined;
    } else {
      chunks.push({ t: t, bytes: r.value.byteLength, preview: text.replace(/\s+/g, " ").trim().slice(0, 80), late: isLate || undefined });
    }
    tail = (tail + text).slice(-${LATE_TAIL_CHARS});
    total += r.value.byteLength;
    if (total > 5e6) { truncated = true; await reader.cancel(); break; }
  }
  // Keep previews only where they matter (first, late, after a gap) so the upload stays small.
  chunks.forEach((c, i) => {
    const prev = chunks[i - 1];
    const afterGap = prev && c.t - (prev.end === undefined ? prev.t : prev.end) >= 100;
    if (i > 0 && !c.late && !afterGap) delete c.preview;
  });
  const last = chunks[chunks.length - 1];
  const measurement = {
    url: url, finalUrl: target, status: res.status, startedAt: startedAt, headersMs: headersMs,
    totalMs: performance.now() - t0, measuredFrom: "local", chunks: chunks,
    lastByteMs: last ? (last.end === undefined ? last.t : last.end) : undefined,
    redirects: redirects || undefined, truncated: truncated || undefined,
    contentType: res.headers.get("content-type") || undefined,
    contentEncoding: res.headers.get("content-encoding") || undefined,
  };
  const out = await fetch(api + "?format=" + (json ? "json" : "md"), {
    method: "POST", signal: AbortSignal.timeout(30000), headers: { "content-type": "application/json" }, body: JSON.stringify({ measurement: measurement }),
  });
  const body = await out.text();
  if (!out.ok) {
    console.error("Analysis failed (HTTP " + out.status + "): " + body.slice(0, 300));
    process.exit(1);
  }
  console.log(body);
})().catch((e) => {
  const timedOut = e && (e.name === "TimeoutError" || e.name === "AbortError");
  console.error(timedOut ? "Timed out after 30s (page or analysis server too slow)" : e && e.message ? e.message : e);
  process.exit(1);
});
`;
