import { analyzeLoad } from "@/features/trace-timeline/analyzeLoad";
import { buildFixPrompt } from "@/features/trace-timeline/fixPrompt";
import { parseTrace, summarizeTrace } from "@/features/trace-timeline/parseTrace";

const USAGE =
  "POST a Chrome performance trace (.json from DevTools, Lighthouse --save-assets, or scripts/record-trace.mjs) to this URL. Body must be under 4 MB; analyze larger traces in the /trace UI. See /llms.txt.";

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
  const body = await request.json().catch(() => undefined);
  if (body === undefined) return fail(md, 400, `Body is not valid JSON. ${USAGE}`);

  let analysis;
  let summary;
  try {
    const trace = parseTrace(body);
    analysis = analyzeLoad(trace);
    summary = summarizeTrace(trace);
  } catch (e) {
    return fail(md, 400, `${e instanceof Error ? e.message : "Not a usable trace."} ${USAGE}`);
  }
  const brief = buildFixPrompt(analysis);
  if (md) {
    return new Response(brief, { headers: { "content-type": "text/markdown; charset=utf-8" } });
  }
  const { ttfb, fcp, lcp, cls, blockingMs } = analysis;
  return Response.json({ summary, metrics: { ttfb, fcp, lcp, cls, blockingMs }, analysis, brief });
}
