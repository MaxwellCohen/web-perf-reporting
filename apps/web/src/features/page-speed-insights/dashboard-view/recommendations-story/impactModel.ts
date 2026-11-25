import { FIXES } from "@/features/page-speed-insights/dashboard-view/investigate/diagnosisModel";
import { buildFixPrompt } from "@/features/page-speed-insights/dashboard-view/investigate/fixPrompt";
import {
  estimatePointsGained,
  formFactorOf,
} from "@/features/page-speed-insights/dashboard-view/investigate/metricScoring";
import { summarizeReport } from "@/features/page-speed-insights/dashboard-view/reportScoreSummary";
import type { CwvMetricAcronym } from "@/features/page-speed-insights/metricCauseAudits";
import { formatBytes, formatMs, shortUrl } from "@/features/page-speed-insights/shared/format";
import type { AuditResult, PageSpeedInsights } from "@/lib/schema";

export const IMPACT_METRICS = ["LCP", "TBT", "CLS", "FCP"] as const;
export type ImpactMetric = (typeof IMPACT_METRICS)[number];

type Savings = Partial<Record<CwvMetricAcronym, number>>;

type OpportunityFile = { url: string; now: string; saves: string };

export type Opportunity = {
  id: string;
  title: string;
  metrics: ImpactMetric[];
  savings: Savings;
  pointsGained: number;
  savingDisplay: string;
  savingWhat: string;
  why: string;
  files: OpportunityFile[];
  fix: string;
};

const FILES_SHOWN = 6;
const MS_METRICS = ["LCP", "TBT", "FCP"] as const;

function num(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

/** First sentence of a Lighthouse description, with markdown links reduced to their text. */
function firstSentence(description: string | undefined): string {
  const plain = (description ?? "").replace(/\[([^\]]*)\]\([^)]*\)/g, "$1").trim();
  const match = plain.match(/^.*?[.!?](?=\s|$)/);
  return (match?.[0] ?? plain).trim();
}

function rowsOf(audit: AuditResult): Record<string, unknown>[] {
  const items = (audit.details as { items?: unknown } | undefined)?.items;
  return Array.isArray(items) ? (items as Record<string, unknown>[]) : [];
}

function wastedBytesOf(audit: AuditResult): number {
  const overall = num(
    (audit.details as { overallSavingsBytes?: unknown } | undefined)?.overallSavingsBytes,
  );
  if (overall !== null) return overall;
  return rowsOf(audit).reduce((sum, row) => sum + (num(row.wastedBytes) ?? 0), 0);
}

function filesOf(audit: AuditResult): OpportunityFile[] {
  return rowsOf(audit)
    .flatMap((row) => {
      const url = typeof row.url === "string" && row.url ? row.url : null;
      if (!url) return [];
      const bytes = num(row.wastedBytes);
      const ms = num(row.wastedMs);
      const total = num(row.totalBytes);
      const time = num(row.total) ?? num(row.duration);
      return [
        {
          url,
          rank: bytes ?? ms ?? time ?? 0,
          now: total !== null ? formatBytes(total) : time !== null ? formatMs(time) : "—",
          saves: bytes ? formatBytes(bytes) : ms ? formatMs(ms) : "—",
        },
      ];
    })
    .sort((a, b) => b.rank - a.rank)
    .slice(0, FILES_SHOWN)
    .map(({ url, now, saves }) => ({ url: shortUrl(url), now, saves }));
}

function describeSaving(
  savings: Savings,
  bytes: number,
): Pick<Opportunity, "savingDisplay" | "savingWhat"> {
  const [metric, ms] = MS_METRICS.map((m) => [m, savings[m] ?? 0] as const).sort(
    (a, b) => b[1] - a[1],
  )[0];
  if (ms > 0) return { savingDisplay: `−${formatMs(ms)}`, savingWhat: `off ${metric}` };
  if ((savings.CLS ?? 0) > 0) {
    return { savingDisplay: `−${(savings.CLS ?? 0).toFixed(3)}`, savingWhat: "off CLS" };
  }
  return { savingDisplay: formatBytes(bytes), savingWhat: "less data transferred" };
}

function msTotal(savings: Savings): number {
  return MS_METRICS.reduce((sum, m) => sum + (savings[m] ?? 0), 0);
}

/** Audits that would cut a metric or bytes, ranked by estimated performance points gained. */
export function buildImpactOpportunities(item: PageSpeedInsights): Opportunity[] {
  const audits = item.lighthouseResult?.audits ?? {};
  const found: Array<Opportunity & { bytes: number }> = [];
  for (const [id, audit] of Object.entries(audits)) {
    if (["notApplicable", "manual", "error"].includes(audit.scoreDisplayMode)) continue;
    const savings: Savings = {};
    for (const metric of IMPACT_METRICS) {
      const value = audit.metricSavings?.[metric];
      if (typeof value === "number" && value > 0) savings[metric] = value;
    }
    const bytes = wastedBytesOf(audit);
    if (!Object.keys(savings).length && bytes <= 0) continue;
    found.push({
      id,
      title: audit.title,
      metrics: IMPACT_METRICS.filter((m) => savings[m]),
      savings,
      pointsGained: estimatePointsGained(item, savings),
      ...describeSaving(savings, bytes),
      why: firstSentence(audit.description),
      files: filesOf(audit),
      fix: FIXES[id] ?? "See the Lighthouse audit for details.",
      bytes,
    });
  }
  return found
    .sort(
      (a, b) =>
        b.pointsGained - a.pointsGained ||
        msTotal(b.savings) - msTotal(a.savings) ||
        b.bytes - a.bytes,
    )
    .map(({ bytes: _bytes, ...opportunity }) => opportunity);
}

/** Performance score now vs. with the selected fixes (savings summed per metric, then re-scored). */
export function projectScore(
  item: PageSpeedInsights,
  selectedIds: ReadonlySet<string> | string[],
  opportunities: Opportunity[],
): { now: number | null; projected: number | null } {
  const score = summarizeReport({ item, label: "" }).performance?.score;
  if (typeof score !== "number") return { now: null, projected: null };
  const now = Math.round(score * 100);
  const selected = new Set(selectedIds);
  const combined: Savings = {};
  for (const opportunity of opportunities) {
    if (!selected.has(opportunity.id)) continue;
    for (const metric of IMPACT_METRICS) {
      combined[metric] = (combined[metric] ?? 0) + (opportunity.savings[metric] ?? 0);
    }
  }
  const audits = item.lighthouseResult?.audits ?? {};
  for (const { id, acronym } of summarizeReport({ item, label: "" }).metrics) {
    const value = audits[id]?.numericValue;
    const total = combined[acronym];
    if (total && typeof value === "number") combined[acronym] = Math.min(total, value);
  }
  const gained = estimatePointsGained(item, combined);
  return { now, projected: Math.min(100, Math.max(now, Math.round(score * 100 + gained))) };
}

export function fixPromptFor(item: PageSpeedInsights, opportunity: Opportunity): string {
  return buildFixPrompt({
    url: item.lighthouseResult?.finalUrl ?? item.lighthouseResult?.requestedUrl ?? "",
    formFactor: formFactorOf(item),
    ...(opportunity.metrics[0] ? { metric: opportunity.metrics[0] } : {}),
    title: opportunity.title,
    evidence: [
      { k: "Estimated saving", v: `${opportunity.savingDisplay} ${opportunity.savingWhat}` },
      ...opportunity.files.map((f) => ({ k: f.url, v: `now ${f.now}, saves ${f.saves}` })),
    ],
    fix: opportunity.fix,
    auditId: opportunity.id,
  });
}

/** Markdown brief for an AI coding agent covering every item in the plan. */
export function planPrompt(item: PageSpeedInsights, opportunities: Opportunity[]): string {
  const lines = [
    "# Performance fix plan",
    "",
    `- Page: ${item.lighthouseResult?.finalUrl ?? item.lighthouseResult?.requestedUrl ?? ""}`,
    `- Device: ${formFactorOf(item)}`,
    "",
    "Work through these in order, highest estimated impact first.",
  ];
  opportunities.forEach((o, index) => {
    lines.push(
      "",
      `## ${index + 1}. ${o.title}`,
      `- Lighthouse audit: ${o.id}`,
      `- Estimated gain: +${o.pointsGained.toFixed(1)} pts (${o.savingDisplay} ${o.savingWhat})`,
      ...(o.files.length
        ? ["- Files:", ...o.files.map((f) => `  - ${f.url} (now ${f.now}, saves ${f.saves})`)]
        : []),
      `- Fix: ${o.fix}`,
    );
  });
  lines.push(
    "",
    "## Verify",
    "Re-run Lighthouse (PageSpeed Insights) on the same page and device, and confirm the score and each audit improve.",
  );
  return lines.join("\n");
}
