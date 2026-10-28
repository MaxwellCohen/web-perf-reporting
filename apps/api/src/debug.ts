import type { ApiBindings } from "./bindings";
import { newestToMs } from "./crux/freshness";
import type { StoredRecord } from "./pagespeed/storage";

/** Caps keep one debug request well inside Workers' subrequest limits. */
const MAX_KEYS_LISTED = 1000;
const MAX_RECORDS_READ = 200;
const RECENT_LIMIT = 25;

export type Check = { ok: boolean; ms: number; error?: string };

export type DebugStatus = {
  generatedAt: string;
  secrets: { PAGESPEED_INSIGHTS_API: boolean; WORKER_API_KEY: boolean };
  checks: { kv: Check; d1: Check; r2: Check };
  d1: { historicalMetricsRows: number; newestHistoryAt: string | null } | null;
  pagespeed: {
    recordsListed: number;
    truncated: boolean;
    byStatus: Record<string, number>;
    recent: {
      publicId: string;
      url: string;
      status: string;
      createdAt: string;
      error?: string;
    }[];
  } | null;
  crux: { jobsListed: number; truncated: boolean } | null;
};

async function timed<T>(run: () => Promise<T>): Promise<{ check: Check; value: T | null }> {
  const start = Date.now();
  try {
    const value = await run();
    return { check: { ok: true, ms: Date.now() - start }, value };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { check: { ok: false, ms: Date.now() - start, error: message }, value: null };
  }
}

async function listKeys(env: ApiBindings, prefix: string): Promise<{ names: string[]; truncated: boolean }> {
  const names: string[] = [];
  let cursor: string | undefined;
  do {
    const page = await env.KV.list({ prefix, cursor, limit: 1000 });
    names.push(...page.keys.map((key) => key.name));
    cursor = page.list_complete ? undefined : page.cursor;
  } while (cursor && names.length < MAX_KEYS_LISTED);
  return { names: names.slice(0, MAX_KEYS_LISTED), truncated: Boolean(cursor) || names.length > MAX_KEYS_LISTED };
}

async function pageSpeedSummary(env: ApiBindings): Promise<NonNullable<DebugStatus["pagespeed"]>> {
  const { names, truncated } = await listKeys(env, "record:");
  const recordKeys = names.filter((name) => !name.includes(":strategy:"));
  const raws = await Promise.all(recordKeys.slice(0, MAX_RECORDS_READ).map((key) => env.KV.get(key)));
  const records = raws.flatMap((raw) => (raw ? [JSON.parse(raw) as StoredRecord] : []));

  const byStatus: Record<string, number> = {};
  for (const record of records) byStatus[record.status] = (byStatus[record.status] ?? 0) + 1;

  const recent = records
    .sort((a, b) => b.date - a.date)
    .slice(0, RECENT_LIMIT)
    .map((record) => ({
      publicId: record.publicId,
      url: record.url,
      status: record.status,
      createdAt: new Date(record.date).toISOString(),
      ...(record.failure?.error ? { error: record.failure.error } : {}),
    }));

  return {
    recordsListed: recordKeys.length,
    truncated: truncated || recordKeys.length > MAX_RECORDS_READ,
    byStatus,
    recent,
  };
}

async function d1Summary(env: ApiBindings): Promise<NonNullable<DebugStatus["d1"]>> {
  const row = await env.DB.prepare(
    "SELECT COUNT(*) AS total, MAX(date2) AS newest FROM Historical_Metrics",
  ).first<{ total: number; newest: number | null }>();
  const newestMs = newestToMs(row?.newest ?? null);
  return {
    historicalMetricsRows: row?.total ?? 0,
    newestHistoryAt: newestMs == null ? null : new Date(newestMs).toISOString(),
  };
}

/** Read-only snapshot of the API's config and stores. Never includes secret values. */
export async function collectDebugStatus(env: ApiBindings): Promise<DebugStatus> {
  const [kv, d1, r2, crux] = await Promise.all([
    timed(() => pageSpeedSummary(env)),
    timed(() => d1Summary(env)),
    timed(() => env.RESULTS_BUCKET.get("debug/health-probe")),
    timed(() => listKeys(env, "crux-job:")),
  ]);

  return {
    generatedAt: new Date().toISOString(),
    secrets: {
      PAGESPEED_INSIGHTS_API: Boolean(env.PAGESPEED_INSIGHTS_API),
      WORKER_API_KEY: Boolean(env.WORKER_API_KEY),
    },
    checks: { kv: kv.check, d1: d1.check, r2: r2.check },
    d1: d1.value,
    pagespeed: kv.value,
    crux: crux.value ? { jobsListed: crux.value.names.length, truncated: crux.value.truncated } : null,
  };
}

function escapeHtml(value: unknown): string {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function badge(ok: boolean, label = ok ? "ok" : "fail"): string {
  return `<span class="${ok ? "ok" : "fail"}">${escapeHtml(label)}</span>`;
}

function count(value: number, truncated: boolean): string {
  return `${value}${truncated ? "+" : ""}`;
}

export function renderDebugHtml(status: DebugStatus, jsonHref: string): string {
  const checkRows = Object.entries(status.checks)
    .map(
      ([name, check]) =>
        `<tr><td>${escapeHtml(name.toUpperCase())}</td><td>${badge(check.ok)}</td><td>${check.ms} ms</td><td>${escapeHtml(check.error ?? "")}</td></tr>`,
    )
    .join("");
  const secretRows = Object.entries(status.secrets)
    .map(([name, set]) => `<tr><td>${escapeHtml(name)}</td><td>${badge(set, set ? "set" : "missing")}</td></tr>`)
    .join("");
  const pagespeed = status.pagespeed;
  const statusCounts = pagespeed
    ? Object.entries(pagespeed.byStatus)
        .map(([name, total]) => `${escapeHtml(name)}: ${total}`)
        .join(" · ") || "none"
    : "unavailable";
  const recentRows = (pagespeed?.recent ?? [])
    .map(
      (record) =>
        `<tr><td>${escapeHtml(record.createdAt)}</td><td>${escapeHtml(record.status)}</td><td class="url">${escapeHtml(record.url)}</td><td><a href="/get-by-id?id=${encodeURIComponent(record.publicId)}">${escapeHtml(record.publicId)}</a></td><td>${escapeHtml(record.error ?? "")}</td></tr>`,
    )
    .join("");

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<title>web-perf-report-api debug</title>
<style>
  body { font: 14px/1.4 system-ui, sans-serif; margin: 2rem; color: #1f2328; }
  table { border-collapse: collapse; margin-bottom: 1.5rem; }
  th, td { border: 1px solid #d0d7de; padding: 4px 8px; text-align: left; vertical-align: top; }
  .ok { color: #1a7f37; font-weight: 600; }
  .fail { color: #cf222e; font-weight: 600; }
  .url { max-width: 28rem; overflow-wrap: anywhere; }
  .muted { color: #59636e; }
</style>
</head>
<body>
<h1>web-perf-report-api</h1>
<p class="muted">Generated ${escapeHtml(status.generatedAt)} · <a href="">refresh</a> · <a href="${escapeHtml(jsonHref)}">JSON</a></p>
<h2>Checks</h2>
<table><tr><th>Store</th><th>Status</th><th>Latency</th><th>Error</th></tr>${checkRows}</table>
<h2>Secrets</h2>
<table>${secretRows}</table>
<h2>D1</h2>
<p>${status.d1 ? `Historical_Metrics rows: ${status.d1.historicalMetricsRows} · newest: ${escapeHtml(status.d1.newestHistoryAt ?? "none")}` : "unavailable"}</p>
<h2>PageSpeed</h2>
<p>${pagespeed ? `Records: ${count(pagespeed.recordsListed, pagespeed.truncated)} · ${statusCounts}` : "unavailable"}</p>
<table><tr><th>Created</th><th>Status</th><th>URL</th><th>Id</th><th>Error</th></tr>${recentRows || '<tr><td colspan="5">No records</td></tr>'}</table>
<h2>CrUX</h2>
<p>${status.crux ? `Jobs stored: ${count(status.crux.jobsListed, status.crux.truncated)}` : "unavailable"}</p>
</body>
</html>`;
}
