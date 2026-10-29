// Compact, agent-facing view of a PageSpeed run: scores, metrics, field data, and ranked issues.
// The full Lighthouse JSON is several MB; this keeps only what an agent needs to pick fixes.
import {
  buildSpeedUpPrompt,
  type SpeedUpFocusArea,
} from "@/features/page-speed-insights/dashboard-view/speedUpPrompt";
import {
  collectPlatformNotes,
  type PlatformNotes,
} from "@/features/page-speed-insights/dashboard-view/collectPlatformNotes";
import { formatMs } from "@/features/page-speed-insights/shared/format";
import type { PageSpeedDashboardItem } from "@/lib/page-speed-insights/types";
import type { AuditResult, PageSpeedInsights } from "@/lib/schema";

const CATEGORY_IDS = ["performance", "accessibility", "best-practices", "seo"] as const;
type CategoryId = (typeof CATEGORY_IDS)[number];

const METRIC_IDS: Record<string, string> = {
  "first-contentful-paint": "FCP",
  "largest-contentful-paint": "LCP",
  "total-blocking-time": "TBT",
  "cumulative-layout-shift": "CLS",
  "speed-index": "SI",
};

const FIELD_METRICS: Record<string, string> = {
  LARGEST_CONTENTFUL_PAINT_MS: "LCP",
  INTERACTION_TO_NEXT_PAINT: "INP",
  CUMULATIVE_LAYOUT_SHIFT_SCORE: "CLS",
  FIRST_CONTENTFUL_PAINT_MS: "FCP",
  EXPERIMENTAL_TIME_TO_FIRST_BYTE: "TTFB",
};

const ISSUE_LIMIT = 40;
const EXAMPLE_LIMIT = 3;
const DESCRIPTION_LIMIT = 400;

export type Rating = "good" | "needs-improvement" | "poor";

export type AgentLabMetric = {
  id: string;
  acronym: string;
  value: string | null;
  numericValue: number | null;
  rating: Rating | null;
};

export type AgentFieldMetric = {
  acronym: string;
  p75: string;
  category: string | null;
};

export type AgentReportSummary = {
  label: string;
  finalUrl: string | null;
  scores: Partial<Record<CategoryId, number | null>>;
  lab: AgentLabMetric[];
  /** Real-user CrUX data for this URL; falls back to the origin when the URL has too little traffic. */
  field: { source: "url" | "origin"; metrics: AgentFieldMetric[] } | null;
  /** Baseline browser-support status of features the page uses, and CSP findings. */
  platformNotes: PlatformNotes | null;
};

export type AgentIssue = {
  id: string;
  category: CategoryId;
  title: string;
  description: string;
  /** Worst score across reports, 0–1. */
  score: number;
  displayValue: string | null;
  /** Lighthouse estimates: milliseconds for LCP/FCP/TBT, unitless for CLS. */
  metricSavings: Record<string, number> | null;
  savingsBytes: number | null;
  /** Which reports (Mobile/Desktop) failed this audit. */
  reports: string[];
  /** Offending elements or resources, to locate the problem in the codebase. */
  examples: string[];
};

export type AgentReport = {
  url: string;
  /** Personalized speed-up prompt built from this report's findings; hand it to a coding agent as-is. */
  speedUpPrompt: string;
  reports: AgentReportSummary[];
  /** Grouped performance work with evidence and framework-agnostic advice. */
  focusAreas: SpeedUpFocusArea[];
  /** Failing audits across all categories, most impactful first. */
  issues: AgentIssue[];
};

// ---------------------------------------------------------------- helpers

function finite(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function text(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function rating(score: number | null): Rating | null {
  if (score === null) return null;
  if (score >= 0.9) return "good";
  if (score >= 0.5) return "needs-improvement";
  return "poor";
}

function isScoredFailure(audit: AuditResult | undefined): audit is AuditResult & { score: number } {
  const mode = audit?.scoreDisplayMode?.toLowerCase();
  if (
    !audit ||
    mode === "notapplicable" ||
    mode === "manual" ||
    mode === "informative" ||
    mode === "error"
  ) {
    return false;
  }
  return typeof audit.score === "number" && audit.score < 0.9;
}

function truncate(value: string, limit: number): string {
  return value.length > limit ? `${value.slice(0, limit - 1)}…` : value;
}

function details(audit: AuditResult): Record<string, unknown> {
  return (audit.details ?? {}) as Record<string, unknown>;
}

function auditItems(audit: AuditResult): Record<string, unknown>[] {
  const items = details(audit).items;
  return Array.isArray(items) ? (items as Record<string, unknown>[]) : [];
}

/** A short pointer at what failed: a DOM selector + snippet, or a resource URL. */
function describeItem(item: Record<string, unknown>): string | null {
  const node = (item.node ?? (item.type === "node" ? item : null)) as Record<
    string,
    unknown
  > | null;
  if (node && typeof node === "object") {
    const selector = text(node.selector);
    const snippet = text(node.snippet);
    if (selector || snippet) {
      return truncate([selector, snippet && `\`${snippet}\``].filter(Boolean).join(" "), 200);
    }
  }
  const url = text(item.url) ?? text(item.source && (item.source as Record<string, unknown>).url);
  if (url) return truncate(url, 200);
  const entity =
    text(item.entity) ?? text((item.entity as Record<string, unknown> | undefined)?.text);
  if (entity) return entity;
  return text(item.description) ? truncate(text(item.description)!, 200) : null;
}

function examples(audit: AuditResult): string[] {
  const seen = new Set<string>();
  for (const item of auditItems(audit)) {
    const line = describeItem(item);
    if (line) seen.add(line);
    if (seen.size >= EXAMPLE_LIMIT) break;
  }
  return [...seen];
}

function totalMsSavings(issue: AgentIssue): number {
  const savings = issue.metricSavings ?? {};
  return (savings.LCP ?? 0) + (savings.FCP ?? 0) + (savings.TBT ?? 0) + (savings.CLS ?? 0) * 10_000;
}

// ---------------------------------------------------------------- summary

function summarize({ item, label }: PageSpeedDashboardItem): AgentReportSummary {
  const lighthouse = item.lighthouseResult;
  const audits = lighthouse?.audits ?? {};
  const categories = lighthouse?.categories ?? {};

  const scores: AgentReportSummary["scores"] = {};
  for (const id of CATEGORY_IDS) {
    if (categories[id]) scores[id] = finite(categories[id]?.score);
  }

  const lab = Object.entries(METRIC_IDS).flatMap(([id, acronym]) => {
    const audit = audits[id];
    if (!audit) return [];
    return [
      {
        id,
        acronym,
        value: audit.displayValue ?? null,
        numericValue: finite(audit.numericValue),
        rating: rating(finite(audit.score)),
      },
    ];
  });

  return {
    label,
    finalUrl: lighthouse?.finalDisplayedUrl ?? lighthouse?.finalUrl ?? null,
    scores,
    lab,
    field: fieldData(item),
    platformNotes: collectPlatformNotes(audits),
  };
}

type FieldMetricRaw = { percentile?: number; category?: string };

function fieldData(item: PageSpeedInsights): AgentReportSummary["field"] {
  const sources = [
    ["url", item.loadingExperience],
    ["origin", item.originLoadingExperience],
  ] as const;
  for (const [source, experience] of sources) {
    const raw = (experience as { metrics?: Record<string, FieldMetricRaw> } | undefined)?.metrics;
    if (!raw) continue;
    const metrics = Object.entries(FIELD_METRICS).flatMap(([key, acronym]) => {
      const p75 = finite(raw[key]?.percentile);
      if (p75 === null) return [];
      return [
        {
          acronym,
          p75: key === "CUMULATIVE_LAYOUT_SHIFT_SCORE" ? (p75 / 100).toFixed(2) : formatMs(p75),
          category: raw[key]?.category ?? null,
        },
      ];
    });
    if (metrics.length) return { source, metrics };
  }
  return null;
}

// ---------------------------------------------------------------- issues

function collectIssues(items: PageSpeedDashboardItem[]): AgentIssue[] {
  const byId = new Map<string, AgentIssue & { weight: number }>();

  for (const { item, label } of items) {
    const lighthouse = item.lighthouseResult;
    const audits = lighthouse?.audits ?? {};
    for (const categoryId of CATEGORY_IDS) {
      for (const ref of lighthouse?.categories?.[categoryId]?.auditRefs ?? []) {
        // Lab metrics are reported separately; "hidden" refs duplicate them.
        if (!ref.id || ref.group === "metrics" || ref.group === "hidden") continue;
        const audit = audits[ref.id];
        if (!isScoredFailure(audit)) continue;

        const existing = byId.get(ref.id);
        if (existing) {
          if (!existing.reports.includes(label)) existing.reports.push(label);
          if (audit.score < existing.score) {
            existing.score = audit.score;
            existing.displayValue = audit.displayValue ?? existing.displayValue;
            existing.metricSavings = audit.metricSavings ?? existing.metricSavings;
            existing.savingsBytes =
              finite(details(audit).overallSavingsBytes) ?? existing.savingsBytes;
          }
          continue;
        }

        byId.set(ref.id, {
          id: ref.id,
          category: categoryId,
          title: audit.title,
          description: truncate(audit.description ?? "", DESCRIPTION_LIMIT),
          score: audit.score,
          displayValue: audit.displayValue ?? null,
          metricSavings:
            audit.metricSavings && Object.keys(audit.metricSavings).length
              ? audit.metricSavings
              : null,
          savingsBytes: finite(details(audit).overallSavingsBytes),
          reports: [label],
          examples: examples(audit),
          weight: ref.weight ?? 0,
        });
      }
    }
  }

  const categoryOrder = (issue: AgentIssue) => CATEGORY_IDS.indexOf(issue.category);
  return [...byId.values()]
    .sort(
      (a, b) =>
        categoryOrder(a) - categoryOrder(b) ||
        totalMsSavings(b) - totalMsSavings(a) ||
        (b.savingsBytes ?? 0) - (a.savingsBytes ?? 0) ||
        b.weight - a.weight ||
        a.score - b.score,
    )
    .slice(0, ISSUE_LIMIT)
    .map(({ weight: _weight, ...issue }) => issue);
}

// ---------------------------------------------------------------- public API

export function buildAgentReport(input: {
  url: string;
  items: PageSpeedDashboardItem[];
}): AgentReport {
  const items = input.items.filter((entry) => entry.item?.lighthouseResult);
  const prompt = buildSpeedUpPrompt(items);
  return {
    url: input.url,
    speedUpPrompt: prompt.text,
    reports: items.map(summarize),
    focusAreas: prompt.focusAreas,
    issues: collectIssues(items),
  };
}

function formatScore(score: number | null | undefined): string {
  return typeof score === "number" ? String(Math.round(score * 100)) : "–";
}

function platformNoteLines(notes: PlatformNotes | null): string[] {
  if (!notes) return [];
  const lines: string[] = [];
  const { baseline, csp } = notes;
  if (baseline) {
    const limited = baseline.highlighted.filter((f) => f.tier === "limited").map((f) => f.id);
    lines.push(
      `Baseline features used: ${baseline.counts.widely} widely available, ${baseline.counts.newly} newly available, ${baseline.counts.limited} limited${limited.length ? ` (limited: ${limited.join(", ")})` : ""}`,
    );
  }
  for (const finding of csp) {
    const meta = [finding.severity, finding.directive].filter(Boolean).join(", ");
    lines.push(`CSP: ${finding.description}${meta ? ` (${meta})` : ""}`);
  }
  return lines;
}

export function renderAgentReportMarkdown(report: AgentReport): string {
  const lines: string[] = [
    `# Web performance report: ${report.url}`,
    "",
    "## Scores (0–100)",
    "",
    "| Report | Performance | Accessibility | Best practices | SEO |",
    "|---|---|---|---|---|",
    ...report.reports.map(
      (r) =>
        `| ${r.label} | ${formatScore(r.scores.performance)} | ${formatScore(r.scores.accessibility)} | ${formatScore(r.scores["best-practices"])} | ${formatScore(r.scores.seo)} |`,
    ),
  ];

  for (const r of report.reports) {
    lines.push("", `## ${r.label} metrics`, "");
    if (r.lab.length) {
      lines.push(
        `Lab: ${r.lab.map((m) => `${m.acronym} ${m.value ?? "–"}${m.rating ? ` (${m.rating})` : ""}`).join("; ")}`,
      );
    }
    if (r.field) {
      lines.push(
        `Real users (CrUX p75, ${r.field.source}): ${r.field.metrics
          .map((m) => `${m.acronym} ${m.p75}${m.category ? ` (${m.category.toLowerCase()})` : ""}`)
          .join("; ")}`,
      );
    }
    lines.push(...platformNoteLines(r.platformNotes));
  }

  lines.push(
    "",
    "## Speed-up prompt",
    "",
    "Personalized from this report's findings. Follow it, or hand it to a coding agent as-is.",
    "",
    "````markdown",
    report.speedUpPrompt,
    "````",
  );

  lines.push("", "## Issues (most impactful first)", "");
  if (report.issues.length === 0) lines.push("No failing audits.");
  for (const issue of report.issues) {
    const value = issue.displayValue ? ` — ${issue.displayValue}` : "";
    lines.push(
      `- **[${issue.category}] ${issue.title}**${value} (\`${issue.id}\`, ${issue.reports.join(", ")})`,
    );
    for (const example of issue.examples) lines.push(`  - ${example}`);
  }

  lines.push("");
  return lines.join("\n");
}
