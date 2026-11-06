import { analyze, renderStreamMarkdown } from "@/lib/stream-timing/analyze";
import { compareAnalyses, compareVerdict, renderCompareMarkdown } from "@/lib/stream-timing/compare";
import { measureStream } from "@/lib/stream-timing/measure";
import { shareCompareUrlFor, shareUrlFor } from "@/lib/stream-timing/share";
import type { StreamMeasurement } from "@/lib/stream-timing/types";
import { requestOrigin } from "@/lib/stream-timing/origin";
import { acquire, clientKey } from "@/lib/stream-timing/rateLimit";
import { assertPublicHttpUrl, StreamUrlError } from "@/lib/stream-timing/urlGuard";
import { parseMeasurement } from "@/lib/stream-timing/validate";
import { getSiteUrl } from "@/lib/siteUrl";

export const maxDuration = 30;
const MAX_BODY_BYTES = 2_000_000;
const SMALL_BODY_BYTES = 10_000;

/** Read the body without buffering past `max` bytes; null if it is larger. */
async function readCapped(request: Request, max: number): Promise<string | null> {
  const reader = request.body?.getReader();
  if (!reader) return "";
  const parts: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > max) {
      await reader.cancel();
      return null;
    }
    parts.push(value);
  }
  return new TextDecoder().decode(Buffer.concat(parts));
}

function wantsMarkdown(request: Request): boolean {
  const format = new URL(request.url).searchParams.get("format")?.toLowerCase();
  if (format === "md" || format === "markdown") return true;
  if (format === "json") return false;
  return (request.headers.get("accept") ?? "").includes("text/markdown");
}

function fail(md: boolean, status: number, message: string) {
  return md
    ? new Response(`Error: ${message}`, { status, headers: { "content-type": "text/markdown; charset=utf-8" } })
    : Response.json({ error: message }, { status });
}

/** One measurement, or two to compare (A then B). */
async function respond(request: Request, run: () => Promise<StreamMeasurement[]>) {
  const md = wantsMarkdown(request);
  try {
    const [first, second] = await run();
    const origin = requestOrigin(request, getSiteUrl());
    if (!second) {
      const analysis = analyze(first);
      const shareUrl = shareUrlFor(origin, first);
      if (md) {
        return new Response(renderStreamMarkdown(first, analysis, shareUrl), {
          headers: { "content-type": "text/markdown; charset=utf-8" },
        });
      }
      return Response.json({ analysis, measurement: first, shareUrl });
    }
    const [aa, ab] = [analyze(first), analyze(second)];
    const shareUrl = shareCompareUrlFor(origin, first, second);
    if (md) {
      return new Response(renderCompareMarkdown(first, second, shareUrl), {
        headers: { "content-type": "text/markdown; charset=utf-8" },
      });
    }
    return Response.json({
      comparison: { rows: compareAnalyses(aa, ab), verdict: compareVerdict(aa, ab) },
      a: { measurement: first, analysis: aa },
      b: { measurement: second, analysis: ab },
      shareUrl,
    });
  } catch (e) {
    if (e instanceof StreamUrlError) return fail(md, 400, e.message);
    return fail(md, 502, e instanceof Error ? e.message : "Measurement failed");
  }
}

/** Rate-limited server-side measurement of one or two URLs (in parallel); fetches are guarded against private hosts. */
async function measureLimited(request: Request, urls: string[]) {
  try {
    urls.forEach(assertPublicHttpUrl);
  } catch (e) {
    // Invalid URLs are rejected before they spend rate-limit budget.
    return fail(wantsMarkdown(request), e instanceof StreamUrlError ? 400 : 500, e instanceof Error ? e.message : "Invalid URL");
  }
  const slot = acquire(clientKey(request));
  if ("reason" in slot) return fail(wantsMarkdown(request), 429, slot.reason);
  try {
    return await respond(request, () => Promise.all(urls.map(measureStream)));
  } finally {
    slot.release();
  }
}

/** GET ?url=https://example.com[&compare=https://other.example] — measure from the server. */
export function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const url = params.get("url");
  if (!url) return fail(wantsMarkdown(request), 400, "Missing url parameter. See /llms.txt.");
  const compare = params.get("compare");
  return measureLimited(request, compare ? [url, compare] : [url]);
}

/** POST {url, compare?} to measure from the server, or {measurement} / {measurements:[A,B]} (from the CLI or /measure-stream.mjs) to analyze local runs. */
export async function POST(request: Request) {
  const md = wantsMarkdown(request);
  const lengthHeader = request.headers.get("content-length");
  const declared = lengthHeader === null ? Number.NaN : Number(lengthHeader);
  // Bodies declared large are throttled before buffering; uploads of other sizes are throttled once parsed, and {url} bodies by measureLimited.
  const chargeLocal = () => acquire(`local:${clientKey(request)}`, { concurrent: false });
  let charged = false;
  // Unsized (chunked) or large bodies are throttled before buffering; small sized bodies are throttled after parsing.
  if (!(declared <= SMALL_BODY_BYTES)) {
    const slot = chargeLocal();
    if ("reason" in slot) return fail(md, 429, slot.reason);
    charged = true;
  }
  if (declared > MAX_BODY_BYTES) return fail(md, 413, "Body too large");
  const text = await readCapped(request, MAX_BODY_BYTES);
  if (text === null) return fail(md, 413, "Body too large");
  let body: { url?: unknown; compare?: unknown; measurement?: unknown; measurements?: unknown } | null;
  try {
    body = JSON.parse(text);
  } catch {
    return fail(md, 400, "Body must be JSON");
  }
  const uploaded =
    body?.measurements !== undefined
      ? Array.isArray(body.measurements) && body.measurements.length === 2
        ? body.measurements
        : null
      : body?.measurement !== undefined
        ? [body.measurement]
        : undefined;
  if (uploaded === null) return fail(md, 400, "measurements must be an array of exactly two measurements");
  if (uploaded) {
    const parsed = uploaded.map(parseMeasurement);
    if (parsed.some((p) => !p)) return fail(md, 400, "Invalid measurement");
    if (!charged) {
      const slot = chargeLocal();
      if ("reason" in slot) return fail(md, 429, slot.reason);
    }
    return respond(request, async () => parsed.map((p) => ({ ...p!, measuredFrom: "local" as const })));
  }
  if (typeof body?.url === "string") {
    return measureLimited(request, typeof body.compare === "string" && body.compare ? [body.url, body.compare] : [body.url]);
  }
  return fail(md, 400, "Provide {url}, {url, compare}, {measurement} or {measurements:[A,B]}");
}
