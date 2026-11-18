import {
  checkDelivery,
  CHROME_UA,
  GOOGLEBOT_SMARTPHONE_UA,
  renderDeliveryMarkdown,
} from "@maxwellcohen/delivery-core";
import { acquire, clientKey } from "@/lib/stream-timing/rateLimit";
import { assertPublicHttpUrl, guardedLookup, StreamUrlError } from "@/lib/stream-timing/urlGuard";

export const maxDuration = 30;

// Cost caps: one small request, no storage, bounded work.
const MAX_RUNS = 3;
const MAX_ASSETS = 10;
const FETCH_TIMEOUT_MS = 10_000;
const BUDGET_MS = 25_000;
const DEFAULT_SLOW_READ = 50_000;
const MAX_BODY_BYTES = 10_000;

function wantsMarkdown(request: Request): boolean {
  const format = new URL(request.url).searchParams.get("format")?.toLowerCase();
  if (format === "md" || format === "markdown") return true;
  if (format === "json") return false;
  return (request.headers.get("accept") ?? "").includes("text/markdown");
}

function fail(md: boolean, status: number, message: string) {
  return md
    ? new Response(`Error: ${message}`, {
        status,
        headers: { "content-type": "text/markdown; charset=utf-8" },
      })
    : Response.json({ error: message }, { status });
}

type Input = { url?: unknown; runs?: unknown; slowRead?: unknown; ua?: unknown };

async function check(request: Request, input: Input) {
  const md = wantsMarkdown(request);
  if (typeof input.url !== "string" || !input.url)
    return fail(md, 400, "Missing url parameter. See /llms.txt.");
  let url: URL;
  try {
    url = assertPublicHttpUrl(input.url);
  } catch (e) {
    // Invalid URLs are rejected before they spend rate-limit budget.
    return fail(
      md,
      e instanceof StreamUrlError ? 400 : 500,
      e instanceof Error ? e.message : "Invalid URL",
    );
  }
  const runs = Math.min(MAX_RUNS, Math.max(1, Math.floor(Number(input.runs ?? 1)) || 1));
  const off = [undefined, false, "", "0", "false"].includes(
    input.slowRead as string | boolean | undefined,
  );
  const rate = Number(input.slowRead);
  const slowReadBytesPerSec = off ? undefined : rate > 1 ? Math.max(1000, rate) : DEFAULT_SLOW_READ;
  const slot = acquire(clientKey(request));
  if ("reason" in slot) return fail(md, 429, slot.reason);
  try {
    const report = await checkDelivery(url.href, {
      runs,
      slowReadBytesPerSec,
      maxAssets: MAX_ASSETS,
      userAgent: input.ua === "chrome" ? CHROME_UA : GOOGLEBOT_SMARTPHONE_UA,
      timeoutMs: FETCH_TIMEOUT_MS,
      deadlineMs: BUDGET_MS,
      lookup: guardedLookup,
      assertUrl: assertPublicHttpUrl,
      measuredFrom: "server",
    });
    if (!report.document.status)
      return fail(md, 502, `Could not fetch the page: ${report.document.note ?? "no response"}`);
    return md
      ? new Response(renderDeliveryMarkdown(report), {
          headers: { "content-type": "text/markdown; charset=utf-8" },
        })
      : Response.json(report);
  } catch (e) {
    if (e instanceof StreamUrlError) return fail(md, 400, e.message);
    return fail(md, 502, e instanceof Error ? e.message : "Delivery check failed");
  } finally {
    slot.release();
  }
}

/** GET ?url=https://example.com[&runs=1-3&slowRead=1&ua=googlebot|chrome&format=md|json] — check from the server. */
export function GET(request: Request) {
  const p = new URL(request.url).searchParams;
  return check(request, {
    url: p.get("url") ?? undefined,
    runs: p.get("runs") ?? undefined,
    slowRead: p.get("slowRead") ?? undefined,
    ua: p.get("ua") ?? undefined,
  });
}

/** POST {url, runs?, slowRead?, ua?} */
export async function POST(request: Request) {
  const text = (await request.text()).slice(0, MAX_BODY_BYTES + 1);
  let body: Input | null = null;
  try {
    if (text.length <= MAX_BODY_BYTES) body = JSON.parse(text);
  } catch {
    // handled below
  }
  if (!body || typeof body !== "object")
    return fail(wantsMarkdown(request), 400, "Body must be JSON: {url, runs?, slowRead?, ua?}");
  return check(request, body);
}
