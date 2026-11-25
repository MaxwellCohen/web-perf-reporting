import { FIXES } from "@/features/page-speed-insights/dashboard-view/investigate/diagnosisModel";
import { fieldP75 } from "@/features/page-speed-insights/dashboard-view/investigate/fieldP75";
import { buildFixPrompt } from "@/features/page-speed-insights/dashboard-view/investigate/fixPrompt";
import {
  longTaskItemsFromAudit,
  summarizeLongTaskScripts,
} from "@/features/page-speed-insights/mainThreadTaskSummary";
import { formatBytes, formatMs, shortUrl } from "@/features/page-speed-insights/shared/format";
import type { AuditResult, AuditResultsRecord, PageSpeedInsights, TableItem } from "@/lib/schema";
import { getNumber } from "@/lib/utils";

export type CulpritFinding = {
  auditId: string;
  title: string;
  saving: string;
  detail: string;
  fix: string;
};

export type CulpritRow = {
  url: string;
  name: string;
  type: string;
  party: "first" | "third";
  entity?: string;
  lcpMs: number;
  fcpMs: number;
  tbtMs: number;
  cls: number;
  bytes: number;
  findings: CulpritFinding[];
};

export type CulpritSummary = {
  top: { name: string; cost: string } | null;
  thirdParty: { entities: number; bytes: number; tbtMs: number; cls: number };
  field: { lcp: string | null; inp: string | null; passed: boolean | null };
  /** Where per-file TBT came from: Lighthouse long tasks, or bootup-time scripting. */
  tbtSource: "long-tasks" | "bootup-time" | "none";
};

export type CulpritMatrix = { rows: CulpritRow[]; summary: CulpritSummary };

/** Audits whose items are not per-file findings. */
const SKIPPED_AUDITS = new Set([
  "network-requests",
  "network-rtt",
  "network-server-latency",
  "main-thread-tasks",
  "script-treemap-data",
  "resource-summary",
  "metrics",
  "diagnostics",
  "layout-shifts",
]);

function str(value: unknown): string | null {
  return typeof value === "string" && value ? value : null;
}

function tableItems(audit: AuditResult | undefined): TableItem[] {
  const details = audit?.details;
  return details && "items" in details && Array.isArray(details.items)
    ? (details.items as TableItem[])
    : [];
}

function hostOf(url: string): string {
  try {
    return new URL(url).host;
  } catch {
    return "";
  }
}

function typeOf(resourceType: string | null, url: string): string {
  if (resourceType) return resourceType.toLowerCase();
  return /\.(js|mjs)(\?|$)/.test(url) ? "script" : /\.css(\?|$)/.test(url) ? "stylesheet" : "other";
}

function itemFacts(item: TableItem): string {
  const facts: [string, unknown, (n: number) => string][] = [
    ["Blocking time", item.wastedMs, formatMs],
    ["CPU time", item.total, formatMs],
    ["Main-thread time", item.mainThreadTime, formatMs],
    ["Wasted bytes", item.wastedBytes, formatBytes],
    ["Size", item.totalBytes, formatBytes],
  ];
  return facts
    .flatMap(([k, value, format]) => {
      const n = getNumber(value);
      return n !== undefined && n > 0 ? [`${k} ${format(n)}`] : [];
    })
    .join(" · ");
}

function savingOf(audit: AuditResult, item: TableItem): string {
  const ms = getNumber(item.wastedMs) ?? getNumber(item.total) ?? getNumber(item.mainThreadTime);
  if (ms && ms > 0) return formatMs(ms);
  const bytes = getNumber(item.wastedBytes);
  if (bytes && bytes > 0) return formatBytes(bytes);
  const savings = Object.entries(audit.metricSavings ?? {}).sort((a, b) => b[1] - a[1])[0];
  return savings && savings[1] > 0
    ? savings[0] === "CLS"
      ? `${savings[0]} ${savings[1].toFixed(3)}`
      : `${savings[0]} -${formatMs(savings[1])}`
    : "flagged";
}

function urlFromExtra(extra: unknown): string | null {
  if (typeof extra === "string") return /^https?:\/\//.test(extra) ? extra : null;
  if (!extra || typeof extra !== "object") return null;
  const record = extra as { url?: unknown; value?: unknown };
  return str(record.url) ?? (typeof record.value === "string" ? urlFromExtra(record.value) : null);
}

/** URL of the LCP resource: prioritize-lcp-image, else the LCP element's src matched to a request. */
function lcpUrlOf(audits: AuditResultsRecord) {
  const prioritized = str(tableItems(audits["prioritize-lcp-image"])[0]?.url);
  if (prioritized) return prioritized;
  const nodes = (audits["lcp-breakdown-insight"]?.details as { items?: unknown[] } | undefined)
    ?.items;
  const node = nodes?.find((n) => (n as { type?: string })?.type === "node") as
    | { snippet?: string }
    | undefined;
  const src = node?.snippet?.match(/src="([^"]+)"/)?.[1];
  if (!src) return null;
  const requests = tableItems(audits["network-requests"]);
  return str(requests.find((r) => typeof r.url === "string" && r.url.endsWith(src))?.url);
}

export function buildCulpritMatrix(item: PageSpeedInsights): CulpritMatrix {
  const lhr = item.lighthouseResult;
  const audits = lhr?.audits ?? {};
  const pageHost = hostOf(lhr?.finalUrl ?? "");
  const thirdEntities = new Set(
    (lhr?.entities ?? []).flatMap((e) => (e && !e.isFirstParty ? [e.name] : [])),
  );
  const firstEntities = new Set(
    (lhr?.entities ?? []).flatMap((e) => (e?.isFirstParty ? [e.name] : [])),
  );

  const byUrl = new Map<string, CulpritRow>();
  function slot(url: string): CulpritRow {
    let row = byUrl.get(url);
    if (!row) {
      row = {
        url,
        name: shortUrl(url),
        type: typeOf(null, url),
        party: hostOf(url) === pageHost ? "first" : "third",
        lcpMs: 0,
        fcpMs: 0,
        tbtMs: 0,
        cls: 0,
        bytes: 0,
        findings: [],
      };
      byUrl.set(url, row);
    }
    return row;
  }

  for (const request of tableItems(audits["network-requests"])) {
    const url = str(request.url);
    if (!url || /^(data|blob):/.test(url)) continue;
    const row = slot(url);
    row.type = typeOf(str(request.resourceType), url);
    row.bytes = getNumber(request.transferSize) ?? 0;
    const entity = str(request.entity);
    if (entity) {
      row.entity = entity;
      if (thirdEntities.has(entity)) row.party = "third";
      else if (firstEntities.has(entity)) row.party = "first";
    }
  }

  // FCP and LCP: render-blocking requests delay both.
  for (const blocking of tableItems(audits["render-blocking-insight"])) {
    const url = str(blocking.url);
    const ms = getNumber(blocking.wastedMs);
    if (!url || !ms) continue;
    const row = slot(url);
    row.fcpMs += ms;
    row.lcpMs += ms;
  }

  // LCP: load delay + duration of the LCP resource itself.
  const lcpUrl = lcpUrlOf(audits);
  if (lcpUrl) {
    const parts = (
      audits["lcp-breakdown-insight"]?.details as { items?: { items?: TableItem[] }[] } | undefined
    )?.items?.[0]?.items;
    const ms = (parts ?? [])
      .filter((p) => p.subpart === "resourceLoadDelay" || p.subpart === "resourceLoadDuration")
      .reduce((sum, p) => sum + (getNumber(p.duration) ?? 0), 0);
    if (ms > 0) slot(lcpUrl).lcpMs += ms;
  }

  // TBT: long-task blocking per script, else bootup-time scripting.
  let tbtSource: CulpritSummary["tbtSource"] = "none";
  const scripts = summarizeLongTaskScripts(longTaskItemsFromAudit(audits["main-thread-tasks"]));
  if (scripts.length) {
    tbtSource = "long-tasks";
    for (const script of scripts) slot(script.url).tbtMs += script.blockingTimeMs;
  } else {
    for (const script of tableItems(audits["bootup-time"])) {
      const url = str(script.url);
      const ms = getNumber(script.scripting) ?? getNumber(script.total);
      if (!url || !ms) continue;
      tbtSource = "bootup-time";
      slot(url).tbtMs += ms;
    }
  }

  // CLS: shifts whose cause names a URL (unsized image, web font, injected script).
  const culprits = (audits["cls-culprits-insight"]?.details as { items?: unknown[] } | undefined)
    ?.items;
  for (const table of culprits ?? []) {
    const rows = (table as { items?: TableItem[] })?.items ?? [];
    for (const shift of rows) {
      const score = getNumber(shift.score);
      if (!score) continue;
      const causes = (shift.subItems as { items?: { extra?: unknown }[] } | undefined)?.items;
      for (const url of new Set((causes ?? []).map((c) => urlFromExtra(c.extra)))) {
        if (url) slot(url).cls += score;
      }
    }
  }

  // Findings: any audit row (or sub-row) that names the file.
  for (const [auditId, audit] of Object.entries(audits)) {
    if (SKIPPED_AUDITS.has(auditId)) continue;
    if (audit.scoreDisplayMode === "notApplicable" || audit.scoreDisplayMode === "manual") continue;
    if (audit.scoreDisplayMode !== "informative" && (audit.score ?? 0) >= 0.9) continue;
    const add = (url: string | null, row: TableItem, detail?: string) => {
      if (!url) return;
      slot(url).findings.push({
        auditId,
        title: audit.title,
        saving: savingOf(audit, row),
        detail: detail || itemFacts(row) || str(audit.displayValue) || "",
        fix: FIXES[auditId] ?? "See the raw audit for details.",
      });
    };
    for (const row of tableItems(audit)) {
      add(str(row.url), row);
      for (const sub of (row.subItems as { items?: TableItem[] } | undefined)?.items ?? []) {
        const subUrl = str(sub.url);
        if (subUrl && subUrl !== row.url) {
          add(subUrl, sub, [str(row.entity), itemFacts(sub)].filter(Boolean).join(" · "));
        }
      }
    }
  }

  const all = [...byUrl.values()];
  const rows = all
    .filter((r) => r.lcpMs || r.fcpMs || r.tbtMs || r.cls || r.findings.length)
    .sort((a, b) => b.lcpMs - a.lcpMs || b.tbtMs - a.tbtMs || b.bytes - a.bytes);

  const third = all.filter((r) => r.party === "third");
  const field = fieldP75(item);
  const category = item.loadingExperience?.overall_category;
  const topRow = rows[0];
  const topCosts: [string, number, string][] = topRow
    ? [
        ["LCP", topRow.lcpMs, formatMs(topRow.lcpMs)],
        ["FCP", topRow.fcpMs, formatMs(topRow.fcpMs)],
        ["TBT", topRow.tbtMs, formatMs(topRow.tbtMs)],
      ]
    : [];
  const topCost = topCosts.sort((a, b) => b[1] - a[1])[0];

  return {
    rows,
    summary: {
      top: topRow
        ? {
            name: topRow.name,
            cost:
              topCost && topCost[1] > 0
                ? `${topCost[0]} ${topCost[2]}`
                : topRow.cls > 0
                  ? `CLS ${topRow.cls.toFixed(3)}`
                  : `${topRow.findings.length} finding${topRow.findings.length === 1 ? "" : "s"}`,
          }
        : null,
      thirdParty: {
        entities: new Set(third.map((r) => r.entity ?? hostOf(r.url))).size,
        bytes: third.reduce((sum, r) => sum + r.bytes, 0),
        tbtMs: third.reduce((sum, r) => sum + r.tbtMs, 0),
        cls: third.reduce((sum, r) => sum + r.cls, 0),
      },
      field: {
        lcp: field.LCP?.display ?? null,
        inp: field.INP?.display ?? null,
        passed: category ? category === "FAST" : null,
      },
      tbtSource,
    },
  };
}

/** Markdown brief for an AI coding agent to cut one file's cost. */
export function culpritPrompt(row: CulpritRow, page: { url: string; formFactor: string }): string {
  const costs: [string, string][] = [
    ["LCP", row.lcpMs ? formatMs(row.lcpMs) : ""],
    ["FCP", row.fcpMs ? formatMs(row.fcpMs) : ""],
    ["TBT", row.tbtMs ? formatMs(row.tbtMs) : ""],
    ["CLS", row.cls ? row.cls.toFixed(3) : ""],
  ];
  return buildFixPrompt({
    url: page.url,
    formFactor: page.formFactor,
    title: `Reduce the cost of ${row.name}`,
    evidence: [
      { k: "File", v: row.url },
      { k: "Party", v: row.entity ? `${row.party}-party (${row.entity})` : `${row.party}-party` },
      { k: "Transfer size", v: formatBytes(row.bytes) },
      ...costs.filter(([, v]) => v).map(([k, v]) => ({ k: `${k} cost`, v })),
      ...row.findings.map((f) => ({
        k: f.title,
        v: [f.saving, f.detail].filter(Boolean).join(" · "),
      })),
    ],
    fix: [...new Set(row.findings.map((f) => f.fix))].join("\n") || "Review this file's cost.",
  });
}
