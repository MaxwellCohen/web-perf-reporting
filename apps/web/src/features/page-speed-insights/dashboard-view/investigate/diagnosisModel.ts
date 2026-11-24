import {
  longTaskItemsFromAudit,
  summarizeLongTaskScripts,
} from "@/features/page-speed-insights/mainThreadTaskSummary";
import type { CwvMetricAcronym } from "@/features/page-speed-insights/metricCauseAudits";
import { summarizeReport } from "@/features/page-speed-insights/dashboard-view/reportScoreSummary";
import { fieldP75 } from "@/features/page-speed-insights/dashboard-view/investigate/fieldP75";
import {
  formFactorOf,
  pointsLost,
} from "@/features/page-speed-insights/dashboard-view/investigate/metricScoring";
import { formatBytes, formatMs, shortUrl } from "@/features/page-speed-insights/shared/format";
import type { AuditResult, AuditResultsRecord, PageSpeedInsights, TableItem } from "@/lib/schema";

export type PartStatus = "good" | "ni" | "poor";

type Evidence = { k: string; v: string };

export type Cause = {
  id: string;
  title: string;
  savingDisplay: string;
  evidence: Evidence[];
  fix: string;
  auditId: string;
  timelineLink: boolean;
};

export type Part = {
  id: string;
  label: string;
  /** ms, or layout-shift score for CLS. */
  value: number;
  display: string;
  status: PartStatus;
  causes: Cause[];
};

export type MetricDiagnosis = {
  acronym: CwvMetricAcronym;
  title: string;
  labDisplay: string;
  field: { label: string; display: string; scope: "url" | "origin" } | null;
  score: number;
  weight: number;
  pointsLost: number;
  parts: Part[];
};

export type Diagnosis = {
  url: string;
  formFactor: string;
  metrics: MetricDiagnosis[];
};

const SCRIPTS_SHOWN = 6;
const TOP_ROWS = 3;

export const FIXES: Record<string, string> = {
  "document-latency-insight":
    "Cut server response time: cache the HTML at the edge/CDN, trim backend work before the first byte, remove redirects, and enable text compression.",
  "lcp-discovery-insight":
    "Make the LCP resource discoverable in the initial HTML: drop lazy-loading on it, add fetchpriority=high, or preload it.",
  "image-delivery-insight":
    "Serve the LCP image smaller: use AVIF/WebP, size it to its display dimensions with srcset, and raise compression.",
  "render-blocking-insight":
    "Stop render-blocking requests: inline critical CSS, load other CSS asynchronously, and add defer/async to scripts.",
  "font-display-insight":
    "Add font-display: swap (or optional) to @font-face rules and preload the key font files.",
  "bootup-time":
    "Reduce JavaScript execution: split bundles, defer non-critical scripts, and remove code that is not needed on load.",
  "main-thread-tasks":
    "Break long main-thread tasks into smaller chunks (yield with scheduler.yield or setTimeout) and defer non-urgent work.",
  "unused-javascript":
    "Remove or code-split JavaScript that is not used on this page; load the rest on demand.",
  "legacy-javascript":
    "Stop shipping transpiled polyfills for modern browsers: target current browsers in your build config.",
  "third-parties-insight":
    "Load third-party scripts after the page is interactive (async/defer, facades for embeds) and remove any that are not essential.",
  "cls-culprits-insight":
    "Reserve space for the shifting element before it loads: set explicit width/height or aspect-ratio, and avoid inserting content above existing content.",
  "unsized-images":
    "Give every image explicit width and height attributes (or CSS aspect-ratio) so the browser reserves space.",
};

/** Audits the Timeline tab can illustrate (network or main-thread events). */
const TIMELINE_AUDITS = new Set([
  "document-latency-insight",
  "lcp-discovery-insight",
  "image-delivery-insight",
  "render-blocking-insight",
  "main-thread-tasks",
  "bootup-time",
  "third-parties-insight",
  "cls-culprits-insight",
]);

const NO_CAUSE = (id: string): Cause => ({
  id,
  title: "Nothing to fix here",
  savingDisplay: "no action",
  evidence: [],
  fix: "This part is already small enough that it is not worth optimizing.",
  auditId: "",
  timelineLink: false,
});

function num(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function str(value: unknown): string | null {
  return typeof value === "string" && value ? value : null;
}

function tableItems(audit: AuditResult | undefined): TableItem[] {
  const details = audit?.details;
  return details && "items" in details && Array.isArray(details.items)
    ? (details.items as TableItem[])
    : [];
}

function isUsable(audit: AuditResult | undefined): audit is AuditResult {
  return (
    !!audit && audit.scoreDisplayMode !== "notApplicable" && audit.scoreDisplayMode !== "manual"
  );
}

function statusFor(share: number): PartStatus {
  return share >= 0.4 ? "poor" : share >= 0.15 ? "ni" : "good";
}

function ttfbStatus(ms: number): PartStatus {
  return ms >= 1800 ? "poor" : ms >= 800 ? "ni" : "good";
}

function makePart(
  id: string,
  label: string,
  value: number,
  metricValue: number,
  unit: "ms" | "score",
  causes: Cause[],
  status?: PartStatus,
): Part {
  return {
    id,
    label,
    value,
    display: unit === "ms" ? formatMs(value) : value.toFixed(3),
    status: status ?? statusFor(metricValue > 0 ? value / metricValue : 0),
    causes: causes.length ? causes : [NO_CAUSE(`${id}:none`)],
  };
}

/** One row's most telling numbers, as evidence. */
function rowFacts(row: TableItem): Evidence[] {
  const entries: [string, unknown, (n: number) => string][] = [
    ["Blocking time", row.wastedMs, formatMs],
    ["Total CPU time", row.total, formatMs],
    ["Main-thread time", row.mainThreadTime, formatMs],
    ["Wasted bytes", row.wastedBytes, formatBytes],
    ["Size", row.totalBytes, formatBytes],
    ["Layout shift score", row.score, (n) => n.toFixed(3)],
  ];
  return entries.flatMap(([k, value, format]) => {
    const n = num(value);
    return n !== null && n > 0 ? [{ k, v: format(n) }] : [];
  });
}

function rowEvidence(row: TableItem): Evidence[] {
  const url = str(row.url);
  return [...(url ? [{ k: "URL", v: url }] : []), ...rowFacts(row)];
}

function auditEvidence(audit: AuditResult): Evidence[] {
  const details = audit.details;
  if (details && "type" in details && details.type === "checklist") {
    const server = num(
      (details.debugData as { serverResponseTime?: unknown } | undefined)?.serverResponseTime,
    );
    return [
      ...(server !== null ? [{ k: "Server response", v: formatMs(server) }] : []),
      ...Object.values(details.items)
        .filter((item) => !item.value)
        .map((item) => ({ k: item.label, v: "failed" })),
    ];
  }
  // cls-culprits-insight is a list of tables; flatten to rows.
  const rows = tableItems(audit).flatMap((r) =>
    Array.isArray(r.items) ? (r.items as unknown as TableItem[]) : [r],
  );
  return rows
    .flatMap((row) => {
      const url = str(row.url);
      const node = row.node as
        | { nodeLabel?: string; selector?: string; value?: string }
        | undefined;
      if (node?.value === "Total") return [];
      const name = url ? shortUrl(url) : (node?.nodeLabel ?? node?.selector);
      if (!name) return [];
      return [
        {
          k: name,
          v:
            rowFacts(row)
              .map((e) => `${e.k} ${e.v}`)
              .join(" · ") || "flagged",
        },
      ];
    })
    .slice(0, TOP_ROWS);
}

function savingDisplay(audit: AuditResult, acronym: CwvMetricAcronym, row?: TableItem): string {
  const rowMs = num(row?.wastedMs) ?? num(row?.total);
  if (rowMs && rowMs > 0) return `${formatMs(rowMs)}`;
  const saving = audit.metricSavings?.[acronym] ?? 0;
  if (saving > 0) return acronym === "CLS" ? saving.toFixed(3) : `-${formatMs(saving)}`;
  const wasted = num(row?.wastedBytes);
  if (wasted && wasted > 0) return formatBytes(wasted);
  return audit.displayValue?.replace(/^Est savings of /, "") ?? "see audit";
}

/** A cause from one audit, scoped to a table row when given. */
function causeFrom(
  auditId: string,
  audit: AuditResult,
  acronym: CwvMetricAcronym,
  row?: TableItem,
): Cause {
  return {
    id: row ? `${auditId}:${str(row.url) ?? ""}` : auditId,
    title: audit.title,
    savingDisplay: savingDisplay(audit, acronym, row),
    evidence: row ? rowEvidence(row) : auditEvidence(audit),
    fix: FIXES[auditId] ?? "See the raw audit for details.",
    auditId,
    timelineLink: TIMELINE_AUDITS.has(auditId),
  };
}

/** Whole-audit cause, unless the audit is passing with nothing to save. */
function wholeAuditCause(
  audits: AuditResultsRecord,
  auditId: string,
  acronym: CwvMetricAcronym,
): Cause[] {
  const audit = audits[auditId];
  if (!isUsable(audit)) return [];
  const saves = (audit.metricSavings?.[acronym] ?? 0) > 0;
  const passing = audit.scoreDisplayMode !== "informative" && (audit.score ?? 0) >= 0.9 && !saves;
  const cause = causeFrom(auditId, audit, acronym);
  return passing || !cause.evidence.length ? [] : [cause];
}

function rowCause(
  audits: AuditResultsRecord,
  auditId: string,
  acronym: CwvMetricAcronym,
  url: string,
): Cause[] {
  const audit = audits[auditId];
  if (!isUsable(audit)) return [];
  const row = tableItems(audit).find((r) => r.url === url);
  return row ? [causeFrom(auditId, audit, acronym, row)] : [];
}

/** Long-task blocking per script from main-thread-tasks, else CPU time per script from bootup-time. */
function scriptParts(audits: AuditResultsRecord, metricValue: number): Part[] {
  let rows = summarizeLongTaskScripts(longTaskItemsFromAudit(audits["main-thread-tasks"])).map(
    (r) => ({ url: r.url, ms: r.blockingTimeMs }),
  );
  if (!rows.length) {
    rows = tableItems(audits["bootup-time"]).flatMap((r) => {
      const url = str(r.url);
      const ms = num(r.total);
      return url && ms ? [{ url, ms }] : [];
    });
    rows.sort((a, b) => b.ms - a.ms);
  }
  const shown = rows.slice(0, SCRIPTS_SHOWN);
  const otherMs = rows.slice(SCRIPTS_SHOWN).reduce((sum, r) => sum + r.ms, 0);
  const parts = shown.map(({ url, ms }) =>
    makePart(
      `TBT:${url}`,
      shortUrl(url),
      ms,
      metricValue,
      "ms",
      ["bootup-time", "unused-javascript", "legacy-javascript", "third-parties-insight"].flatMap(
        (auditId) => {
          if (auditId === "third-parties-insight") return thirdPartyCause(audits, url);
          return rowCause(audits, auditId, "TBT", url);
        },
      ),
    ),
  );
  if (otherMs > 0) parts.push(makePart("TBT:other", "Other", otherMs, metricValue, "ms", []));
  return parts;
}

function thirdPartyCause(audits: AuditResultsRecord, url: string): Cause[] {
  const audit = audits["third-parties-insight"];
  if (!isUsable(audit)) return [];
  for (const entity of tableItems(audit)) {
    const sub = (entity.subItems?.items ?? []).find((r) => r.url === url);
    if (sub) {
      const cause = causeFrom("third-parties-insight", audit, "TBT", sub);
      return [
        {
          ...cause,
          evidence: [{ k: "Third party", v: String(entity.entity ?? "") }, ...cause.evidence],
        },
      ];
    }
  }
  return [];
}

function lcpParts(audits: AuditResultsRecord, metricValue: number): Part[] {
  const first = (audits["lcp-breakdown-insight"]?.details as { items?: unknown[] } | undefined)
    ?.items?.[0] as { items?: TableItem[] } | undefined;
  const causeIds: Record<string, string[]> = {
    timeToFirstByte: ["document-latency-insight"],
    resourceLoadDelay: ["lcp-discovery-insight", "render-blocking-insight"],
    resourceLoadDuration: ["image-delivery-insight"],
    elementRenderDelay: ["render-blocking-insight", "main-thread-tasks"],
  };
  return (first?.items ?? []).flatMap((row) => {
    const subpart = str(row.subpart);
    const ms = num(row.duration);
    if (!subpart || ms === null) return [];
    const causes = (causeIds[subpart] ?? []).flatMap((id) => wholeAuditCause(audits, id, "LCP"));
    return [
      makePart(
        `LCP:${subpart}`,
        str(row.label) ?? subpart,
        ms,
        metricValue,
        "ms",
        causes,
        subpart === "timeToFirstByte" ? ttfbStatus(ms) : undefined,
      ),
    ];
  });
}

function serverResponseMs(audits: AuditResultsRecord): number | null {
  const debug = (
    audits["document-latency-insight"]?.details as
      | { debugData?: { serverResponseTime?: unknown } }
      | undefined
  )?.debugData;
  return num(debug?.serverResponseTime);
}

/** Render-blocking requests (and, for SI, slow font swaps) as parts. */
function blockingParts(
  audits: AuditResultsRecord,
  acronym: "FCP" | "SI",
  metricValue: number,
): Part[] {
  const parts: Part[] = [];
  if (acronym === "FCP") {
    const ttfb = serverResponseMs(audits);
    if (ttfb !== null) {
      parts.push(
        makePart(
          "FCP:ttfb",
          "Time to first byte",
          ttfb,
          metricValue,
          "ms",
          wholeAuditCause(audits, "document-latency-insight", acronym),
          ttfbStatus(ttfb),
        ),
      );
    }
  }
  const sources =
    acronym === "FCP"
      ? ["render-blocking-insight"]
      : ["render-blocking-insight", "font-display-insight"];
  for (const auditId of sources) {
    for (const row of tableItems(audits[auditId])) {
      const url = str(row.url);
      const ms = num(row.wastedMs);
      if (!url || !ms) continue;
      parts.push(
        makePart(
          `${acronym}:${auditId}:${url}`,
          shortUrl(url),
          ms,
          metricValue,
          "ms",
          rowCause(audits, auditId, acronym, url),
        ),
      );
    }
  }
  return parts;
}

function clsParts(audits: AuditResultsRecord, metricValue: number): Part[] {
  const culprits = audits["cls-culprits-insight"]?.details as
    | { items?: { items?: TableItem[] }[] }
    | undefined;
  const rows = (culprits?.items ?? []).flatMap((t) => t.items ?? []);
  const shifts = rows.length ? rows : tableItems(audits["layout-shifts"]);
  const causes = ["cls-culprits-insight", "unsized-images"].flatMap((id) =>
    wholeAuditCause(audits, id, "CLS"),
  );
  return shifts.flatMap((row, i) => {
    const node = row.node as
      | { type?: string; value?: string; nodeLabel?: string; selector?: string }
      | undefined;
    const score = num(row.score);
    if (score === null || node?.value === "Total") return [];
    return [
      makePart(
        `CLS:${i}`,
        node?.nodeLabel ?? node?.selector ?? `Shift ${i + 1}`,
        score,
        metricValue,
        "score",
        causes,
      ),
    ];
  });
}

function partsFor(
  acronym: CwvMetricAcronym,
  audits: AuditResultsRecord,
  metricValue: number,
): Part[] {
  switch (acronym) {
    case "LCP":
      return lcpParts(audits, metricValue);
    case "TBT":
      return scriptParts(audits, metricValue);
    case "CLS":
      return clsParts(audits, metricValue);
    default:
      return blockingParts(audits, acronym, metricValue);
  }
}

/** Metrics ranked by performance points lost, each with its breakdown and causes. */
export function buildDiagnosis(item: PageSpeedInsights): Diagnosis {
  const audits = item.lighthouseResult?.audits ?? {};
  const field = fieldP75(item);
  const metrics = summarizeReport({ item, label: "" }).metrics.flatMap((m): MetricDiagnosis[] => {
    if (m.score === null || m.weight === null) return [];
    const value = num(audits[m.id]?.numericValue) ?? 0;
    // TBT's field counterpart is INP.
    const fieldKey = m.acronym === "TBT" ? "INP" : m.acronym === "SI" ? null : m.acronym;
    const f = fieldKey ? field[fieldKey] : null;
    return [
      {
        acronym: m.acronym,
        title: m.title,
        labDisplay: m.displayValue ?? "–",
        field: f && fieldKey ? { label: fieldKey, display: f.display, scope: f.scope } : null,
        score: m.score,
        weight: m.weight,
        pointsLost: pointsLost(m.weight, m.score),
        parts: partsFor(m.acronym, audits, value),
      },
    ];
  });
  metrics.sort((a, b) => b.pointsLost - a.pointsLost);
  return {
    url: item.lighthouseResult?.finalUrl ?? item.lighthouseResult?.requestedUrl ?? "",
    formFactor: formFactorOf(item),
    metrics,
  };
}

/** The worst part of a metric (largest value), if it has any. */
export function worstPart(metric: MetricDiagnosis | undefined): Part | undefined {
  return metric?.parts.reduce<Part | undefined>(
    (worst, part) => (!worst || part.value > worst.value ? part : worst),
    undefined,
  );
}
