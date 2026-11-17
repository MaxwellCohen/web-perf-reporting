import { analyzeLoad } from "@/features/trace-timeline/analyzeLoad";
import { buildFixPrompt } from "@/features/trace-timeline/fixPrompt";
import { buildInsights } from "@/features/trace-timeline/insights";
import { readJsonLimited } from "@/lib/agent/readJsonLimited";
import { parseTrace, summarizeTrace } from "@/features/trace-timeline/parseTrace";

const MAX_BODY_BYTES = 4 * 1024 * 1024;
// A gzipped DevTools trace is much smaller than its JSON. Allow a bounded amount
// of decompressed input while keeping the upload itself under the platform limit.
const MAX_DECOMPRESSED_BYTES = 24 * 1024 * 1024;

const USAGE =
  "POST a Chrome performance trace (.json or .json.gz from DevTools, Lighthouse --save-assets, or scripts/record-trace.mjs) to this URL. Upload must be under 4 MB and under 24 MB once decompressed; analyze larger traces in the /trace UI. See /llms.txt.";

function wantsMarkdown(request: Request): boolean {
  const format = new URL(request.url).searchParams.get("format")?.toLowerCase();
  if (format === "md" || format === "markdown") return true;
  if (format === "json") return false;
  return (request.headers.get("accept") ?? "").includes("text/markdown");
}

function fail(md: boolean, status: number, message: string): Response {
  return md
    ? new Response(`Error: ${message}`, {
        status,
        headers: { "content-type": "text/markdown; charset=utf-8" },
      })
    : Response.json({ error: message }, { status });
}

export function GET(request: Request) {
  return fail(wantsMarkdown(request), 405, USAGE);
}

export async function POST(request: Request) {
  const md = wantsMarkdown(request);
  const read = await readJsonLimited(request, MAX_BODY_BYTES, {
    allowGzip: true,
    maxDecompressedBytes: MAX_DECOMPRESSED_BYTES,
  });
  if (!read.ok) {
    const message =
      read.reason === "too-large"
        ? "Body exceeds 4 MB (or 24 MB once decompressed)."
        : read.reason === "invalid-gzip"
          ? "Body is not valid gzip."
          : "Body is not valid JSON.";
    return fail(md, read.status, `${message} ${USAGE}`);
  }
  const body = read.body;

  let analysis;
  let summary;
  let insights;
  try {
    const trace = parseTrace(body);
    analysis = analyzeLoad(trace);
    summary = summarizeTrace(trace);
    insights = buildInsights(trace, analysis);
  } catch (e) {
    return fail(md, 400, `${e instanceof Error ? e.message : "Not a usable trace."} ${USAGE}`);
  }
  const brief = buildFixPrompt(analysis, insights);
  if (md) {
    return new Response(brief, { headers: { "content-type": "text/markdown; charset=utf-8" } });
  }
  const { ttfb, fcp, lcp, cls, blockingMs } = analysis;
  return Response.json({ summary, metrics: { ttfb, fcp, lcp, cls, blockingMs }, insights, analysis, brief });
}
