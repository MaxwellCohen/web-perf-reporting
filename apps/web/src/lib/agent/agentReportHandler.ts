import { buildAgentReport, renderAgentReportMarkdown } from "@/lib/agent/agentReport";
import type { PageSpeedDashboardItem } from "@/lib/page-speed-insights/types";
import type { PageSpeedInsights } from "@/lib/schema";

const USAGE =
  "POST a Lighthouse JSON report (lighthouse CLI --output=json) or a PageSpeed Insights API response, or an array of them, to this URL. See /llms.txt.";

type Format = "json" | "markdown";

function pickFormat(request: Request): Format {
  const format = new URL(request.url).searchParams.get("format")?.toLowerCase();
  if (format === "md" || format === "markdown") return "markdown";
  if (format === "json") return "json";
  return (request.headers.get("accept") ?? "").includes("text/markdown") ? "markdown" : "json";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

/** Accepts a PSI API response, a raw Lighthouse result, or a dashboard export row. */
function toPsi(entry: unknown): PageSpeedInsights | null {
  if (!isRecord(entry)) return null;
  if (isRecord(entry.lighthouseResult)) return entry as PageSpeedInsights;
  if (isRecord(entry.audits) && isRecord(entry.categories)) {
    return { lighthouseResult: entry } as unknown as PageSpeedInsights;
  }
  if (isRecord(entry.item)) return toPsi(entry.item);
  return null;
}

function labelFor(item: PageSpeedInsights, index: number): string {
  const formFactor = item.lighthouseResult?.configSettings?.formFactor?.toLowerCase();
  if (formFactor === "mobile") return "Mobile";
  if (formFactor === "desktop") return "Desktop";
  return `Report ${index + 1}`;
}

function toDashboardItems(body: unknown): PageSpeedDashboardItem[] {
  const entries = Array.isArray(body) ? body : [body];
  return entries.flatMap((entry, index) => {
    const item = toPsi(entry);
    return item ? [{ item, label: labelFor(item, index) }] : [];
  });
}

function error(format: Format, status: number, message: string): Response {
  if (format === "markdown") {
    return new Response(`Error: ${message}`, {
      status,
      headers: { "content-type": "text/markdown; charset=utf-8" },
    });
  }
  return Response.json({ error: message }, { status });
}

export function handleAgentReportUsage(request: Request): Response {
  return error(pickFormat(request), 405, USAGE);
}

export async function handleAgentReportRequest(request: Request): Promise<Response> {
  const format = pickFormat(request);
  const body = await request.json().catch(() => undefined);
  if (body === undefined) return error(format, 400, `Body is not valid JSON. ${USAGE}`);

  const items = toDashboardItems(body);
  if (items.length === 0) return error(format, 400, `No Lighthouse result found in body. ${USAGE}`);

  const lighthouse = items[0].item.lighthouseResult;
  const report = buildAgentReport({
    url: lighthouse?.finalDisplayedUrl ?? lighthouse?.finalUrl ?? lighthouse?.requestedUrl ?? "",
    items,
  });
  if (format === "markdown") {
    return new Response(renderAgentReportMarkdown(report), {
      headers: { "content-type": "text/markdown; charset=utf-8" },
    });
  }
  return Response.json(report);
}
