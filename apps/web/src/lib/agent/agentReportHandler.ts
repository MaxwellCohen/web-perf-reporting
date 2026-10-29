import { buildAgentReport, renderAgentReportMarkdown } from "@/lib/agent/agentReport";
import {
  fetchWorkerJobEnvelopeByPublicId,
  fetchWorkerStartMeasurement,
} from "@/lib/page-speed-insights/pageSpeedWorkerClient";
import {
  resolveWorkerEnvelope,
  type WorkerJobEnvelope,
} from "@/lib/page-speed-insights/resolveWorkerEnvelope";
import type { PageSpeedDashboardItem } from "@/lib/page-speed-insights/types";
import type { PageSpeedInsights } from "@/lib/schema";
import { getSiteUrl } from "@/lib/siteUrl";
import { updateURl } from "@/lib/utils";

/** Seconds a single request may block waiting for PageSpeed. Keep below the route's maxDuration. */
export const MAX_WAIT_SECONDS = 50;
const POLL_INTERVAL_MS = 4_000;
const RETRY_AFTER_SECONDS = 10;

type Envelope = WorkerJobEnvelope & { publicId?: string };

export type AgentReportDeps = {
  start: (url: string) => Promise<Envelope | null>;
  poll: (publicId: string) => Promise<Envelope | null>;
  sleep: (ms: number) => Promise<void>;
  now: () => number;
};

async function readEnvelope(response: Response): Promise<Envelope | null> {
  // The worker returns 404 for unknown ids; anything non-JSON is treated as missing.
  if (response.status === 404) return null;
  try {
    return (await response.json()) as Envelope;
  } catch {
    return null;
  }
}

export const defaultDeps: AgentReportDeps = {
  start: async (url) => {
    const response = await fetchWorkerStartMeasurement(url, process.env.WORKER_API_KEY ?? "");
    if (!response.ok) throw new Error(`PageSpeed worker returned ${response.status}`);
    return readEnvelope(response);
  },
  poll: async (publicId) => readEnvelope(await fetchWorkerJobEnvelopeByPublicId(publicId)),
  sleep: (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
  now: () => Date.now(),
};

type Format = "json" | "markdown";

function pickFormat(request: Request, params: URLSearchParams): Format {
  const format = params.get("format")?.toLowerCase();
  if (format === "md" || format === "markdown") return "markdown";
  if (format === "json") return "json";
  return (request.headers.get("accept") ?? "").includes("text/markdown") ? "markdown" : "json";
}

function pickWaitSeconds(params: URLSearchParams): number {
  const raw = params.get("wait");
  if (raw === null) return MAX_WAIT_SECONDS;
  const value = Number(raw);
  if (!Number.isFinite(value) || value < 0) return 0;
  return Math.min(value, MAX_WAIT_SECONDS);
}

function labelFor(item: PageSpeedInsights, index: number): string {
  const formFactor = item.lighthouseResult?.configSettings?.formFactor?.toLowerCase();
  if (formFactor === "mobile") return "Mobile";
  if (formFactor === "desktop") return "Desktop";
  return index === 0 ? "Mobile" : "Desktop";
}

function toDashboardItems(body: string): PageSpeedDashboardItem[] | null {
  try {
    const parsed = JSON.parse(body) as unknown;
    if (!Array.isArray(parsed)) return null;
    return parsed.flatMap((entry, index) => {
      // Rows can be wrapped in a one-element array by older workers.
      const item = (Array.isArray(entry) ? entry[0] : entry) as
        | PageSpeedInsights
        | null
        | undefined;
      return item?.lighthouseResult ? [{ item, label: labelFor(item, index) }] : [];
    });
  } catch {
    return null;
  }
}

function json(body: unknown, status: number, headers: Record<string, string> = {}): Response {
  return Response.json(body, { status, headers: { "cache-control": "no-store", ...headers } });
}

function markdown(body: string, status: number, headers: Record<string, string> = {}): Response {
  return new Response(body, {
    status,
    headers: {
      "content-type": "text/markdown; charset=utf-8",
      "cache-control": "no-store",
      ...headers,
    },
  });
}

function respond(format: Format, status: number, body: Record<string, unknown>, md: string) {
  return format === "markdown" ? markdown(md, status) : json(body, status);
}

export async function handleAgentReportRequest(
  request: Request,
  deps: AgentReportDeps = defaultDeps,
): Promise<Response> {
  const requestUrl = new URL(request.url);
  const params = requestUrl.searchParams;
  const format = pickFormat(request, params);
  const deadline = deps.now() + pickWaitSeconds(params) * 1000;

  const rawUrl = params.get("url");
  let publicId = params.get("id")?.trim() || null;
  if (!rawUrl && !publicId) {
    return respond(
      format,
      400,
      {
        error:
          "Pass ?url=<page to test> to start a report, or ?id=<publicId> to fetch one. See /llms.txt.",
      },
      "Error: pass ?url=<page to test> to start a report, or ?id=<publicId> to fetch one. See /llms.txt.",
    );
  }

  let envelope: Envelope | null;
  try {
    if (rawUrl) {
      const url = updateURl(rawUrl);
      if (!url)
        return respond(
          format,
          400,
          { error: `Invalid url: ${rawUrl}` },
          `Error: invalid url ${rawUrl}`,
        );
      envelope = await deps.start(url);
      publicId = envelope?.publicId ?? null;
      if (!publicId) throw new Error("PageSpeed worker did not return a report id");
    } else {
      envelope = await deps.poll(publicId!);
    }

    while (true) {
      const resolved = resolveWorkerEnvelope(envelope);
      if (resolved.kind === "missing") {
        return respond(
          format,
          404,
          { error: `No report with id ${publicId}` },
          `Error: no report with id ${publicId}.`,
        );
      }
      if (resolved.kind === "failed") {
        const body = {
          status: "failed",
          publicId,
          url: resolved.url ?? envelope?.url,
          error: resolved.error,
        };
        return respond(
          format,
          502,
          body,
          `PageSpeed run failed for ${body.url ?? publicId}: ${resolved.error}`,
        );
      }
      if (resolved.kind === "ready") {
        const items = toDashboardItems(resolved.body);
        if (!items?.length) throw new Error("PageSpeed result could not be parsed");
        const report = buildAgentReport({
          publicId: publicId!,
          url: envelope?.url ?? items[0].item.lighthouseResult?.requestedUrl ?? "",
          dashboardUrl: `${getSiteUrl()}/page-speed/${publicId}`,
          items,
        });
        return format === "markdown"
          ? markdown(renderAgentReportMarkdown(report), 200)
          : json(report, 200);
      }
      // pending (or a completed envelope with no data yet)
      if (deps.now() + POLL_INTERVAL_MS > deadline) break;
      await deps.sleep(POLL_INTERVAL_MS);
      envelope = (await deps.poll(publicId!)) ?? envelope;
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return respond(format, 502, { error: message }, `Error: ${message}`);
  }

  const pollUrl = new URL("/api/agent/report", requestUrl.origin);
  pollUrl.searchParams.set("id", publicId!);
  if (format === "markdown") pollUrl.searchParams.set("format", "md");
  const message = `Report is still running (PageSpeed usually takes 30–90 s). Fetch ${pollUrl} again in ${RETRY_AFTER_SECONDS} s.`;
  const headers = { "retry-after": String(RETRY_AFTER_SECONDS) };
  const body = {
    status: "pending",
    publicId,
    url: envelope?.url,
    pollUrl: pollUrl.toString(),
    retryAfterSeconds: RETRY_AFTER_SECONDS,
    message,
  };
  return format === "markdown" ? markdown(message, 202, headers) : json(body, 202, headers);
}
