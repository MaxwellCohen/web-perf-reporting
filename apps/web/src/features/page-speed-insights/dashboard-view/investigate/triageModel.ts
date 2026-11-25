import {
  isUsable,
  num,
  str,
  tableItems,
} from "@/features/page-speed-insights/dashboard-view/investigate/auditTable";
import {
  auditEvidence,
  FIXES,
  type Evidence,
} from "@/features/page-speed-insights/dashboard-view/investigate/diagnosisModel";
import { fieldP75 } from "@/features/page-speed-insights/dashboard-view/investigate/fieldP75";
import { formFactorOf } from "@/features/page-speed-insights/dashboard-view/investigate/metricScoring";
import {
  longTaskItemsFromAudit,
  summarizeLongTaskScripts,
  summarizeMainThreadTasks,
  taskItemsFromAudit,
} from "@/features/page-speed-insights/mainThreadTaskSummary";
import { formatBytes, formatMs, shortUrl } from "@/features/page-speed-insights/shared/format";
import type { AuditResult, AuditResultsRecord, PageSpeedInsights, TableItem } from "@/lib/schema";

export type Verdict = "confirmed" | "contributes" | "ruled-out";

/** Dashboard tabs a hypothesis can deep-link to. */
export type TriageTab = "timeline" | "resources" | "weight" | "audits";

export type Hypothesis = {
  id: string;
  question: string;
  verdict: Verdict;
  summary: string;
  metrics: string[];
  /** Largest metricSavings over LCP/FCP/TBT, in ms. */
  costMs: number | null;
  /** CLS saving, kept apart because it is unitless. */
  costCls: number | null;
  costDisplay: string;
  evidence: Evidence[];
  sourceAudits: string[];
  sourceLabel: string;
  fix: string;
  tab: TriageTab;
  auditId: string;
};

const CONFIRM_MS = 300;
const CONFIRM_CLS = 0.05;
const TBT_SIGNAL_MS = 200;
const TTFB_SIGNAL_MS = 800;
const THIRD_PARTY_FAIL_MS = 250;
const THIRD_PARTY_SIGNAL_MS = 1000;
const MAX_EVIDENCE = 5;
const NO_DATA = "No data in this report.";

type Reading = {
  summary: string;
  evidence?: Evidence[];
  /** Report only `evidence`, not the audit's own rows. */
  ownEvidenceOnly?: boolean;
  /** Extra ms cost beyond metricSavings. */
  ms?: number;
  /** Extra CLS cost beyond metricSavings. */
  cls?: number;
  /** Check-specific evidence that confirms the cause on its own. */
  signal?: boolean;
  /** Overrides the audit's own pass/fail. */
  failing?: boolean;
};

type Context = {
  audit: AuditResult;
  audits: AuditResultsRecord;
  item: PageSpeedInsights;
  failing: boolean;
};

type Check = {
  id: string;
  question: string;
  metrics: string[];
  /** The first usable one is the primary audit. */
  auditIds: string[];
  /** Further audits the reading consults. */
  extraAudits?: string[];
  fixId: string;
  tab: TriageTab;
  /** Only affects repeat visits, so it can contribute but never be confirmed. */
  repeatVisitsOnly?: boolean;
  read: (ctx: Context) => Reading;
};

type Details = { debugData?: Record<string, unknown>; overallSavingsBytes?: unknown };

function detailsOf(audit: AuditResult): Details {
  return (audit.details ?? {}) as Details;
}

function debugNum(audit: AuditResult, key: string): number | null {
  return num(detailsOf(audit).debugData?.[key]);
}

/** Insights pass only at exactly 1; classic audits fail below 0.5. */
function auditFails(id: string, audit: AuditResult): boolean {
  const score = audit.score;
  if (score === null || score === undefined) return false;
  return id.endsWith("-insight") ? score !== 1 : score < 0.5;
}

function savedBytes(audit: AuditResult): number {
  const direct = num(detailsOf(audit).overallSavingsBytes) ?? debugNum(audit, "wastedBytes");
  if (direct !== null) return direct;
  return tableItems(audit).reduce((sum, row) => sum + (num(row.wastedBytes) ?? 0), 0);
}

function bytesReading(
  { audit, failing }: Context,
  problem: (bytes: string) => string,
  fine: string,
): Reading {
  const bytes = savedBytes(audit);
  return { summary: failing && bytes > 0 ? problem(formatBytes(bytes)) : fine };
}

function lcpBreakdownMs(audits: AuditResultsRecord, subpart: string): number | null {
  const tables = tableItems(audits["lcp-breakdown-insight"]);
  const rows = tables.flatMap((t) => (Array.isArray(t.items) ? (t.items as TableItem[]) : []));
  return num(rows.find((row) => row.subpart === subpart)?.duration);
}

function chainDepth(node: { children?: Record<string, unknown> }): number {
  const children = Object.values(node.children ?? {}) as { children?: Record<string, unknown> }[];
  return 1 + Math.max(0, ...children.map(chainDepth));
}

function thirdPartyTotals(audit: AuditResult) {
  const entities = tableItems(audit).flatMap((row) => {
    const name = str(row.entity);
    if (!name) return [];
    const subs = row.subItems?.items ?? [];
    const transfer =
      num(row.transferSize) ?? subs.reduce((sum, sub) => sum + (num(sub.transferSize) ?? 0), 0);
    return [{ name, transfer, mainThreadMs: num(row.mainThreadTime) ?? 0 }];
  });
  entities.sort((a, b) => b.mainThreadMs - a.mainThreadMs);
  return {
    entities,
    transfer: entities.reduce((sum, e) => sum + e.transfer, 0),
    mainThreadMs: entities.reduce((sum, e) => sum + e.mainThreadMs, 0),
  };
}

const CHECKS: Check[] = [
  {
    id: "lcp-found-late",
    question: "Is the main image or text found too late?",
    metrics: ["LCP"],
    auditIds: ["lcp-discovery-insight"],
    extraAudits: ["lcp-breakdown-insight"],
    fixId: "lcp-discovery-insight",
    tab: "timeline",
    read: ({ audits, failing }) => {
      const delay = lcpBreakdownMs(audits, "resourceLoadDelay");
      return {
        summary: failing
          ? `The LCP resource is discovered late${delay ? `, waiting ${formatMs(delay)} before it starts loading` : ""}.`
          : `The LCP resource is discovered promptly${delay !== null ? ` (${formatMs(delay)} load delay)` : ""}.`,
        evidence: delay !== null ? [{ k: "Resource load delay", v: formatMs(delay) }] : undefined,
        ms: failing ? (delay ?? 0) : 0,
      };
    },
  },
  {
    id: "heavy-images",
    question: "Are images heavier than they need to be?",
    metrics: ["LCP", "FCP"],
    auditIds: ["image-delivery-insight"],
    fixId: "image-delivery-insight",
    tab: "weight",
    read: (ctx) =>
      bytesReading(
        ctx,
        (bytes) => `Images could be ${bytes} smaller with better formats, sizing or compression.`,
        "Images are delivered efficiently.",
      ),
  },
  {
    id: "long-tasks",
    question: "Are long JavaScript tasks blocking the page?",
    metrics: ["TBT", "INP"],
    auditIds: ["main-thread-tasks", "long-tasks"],
    extraAudits: ["total-blocking-time"],
    fixId: "main-thread-tasks",
    tab: "resources",
    read: ({ audit, audits }) => {
      const tbt = num(audits["total-blocking-time"]?.numericValue) ?? 0;
      const tasks = summarizeMainThreadTasks(taskItemsFromAudit(audit));
      const scripts = summarizeLongTaskScripts(longTaskItemsFromAudit(audit)).slice(0, 3);
      const failing = tbt > 0 && tasks.longTaskCount > 0;
      return {
        summary: failing
          ? `${tasks.longTaskCount} long ${tasks.longTaskCount === 1 ? "task blocks" : "tasks block"} the main thread (Total Blocking Time ${formatMs(tbt)}).`
          : `Little main-thread blocking (Total Blocking Time ${formatMs(tbt)}).`,
        evidence: [
          { k: "Total Blocking Time", v: formatMs(tbt) },
          ...(tasks.longestDurationMs > 0
            ? [{ k: "Longest task", v: formatMs(tasks.longestDurationMs) }]
            : []),
          ...scripts.map((s) => ({
            k: shortUrl(s.url),
            v: `${formatMs(s.blockingTimeMs)} blocking · ${s.taskCount} ${s.taskCount === 1 ? "task" : "tasks"}`,
          })),
        ],
        ownEvidenceOnly: true,
        ms: failing ? tbt : 0,
        signal: tbt >= TBT_SIGNAL_MS,
        failing,
      };
    },
  },
  {
    id: "render-blocking",
    question: "Are CSS or scripts blocking the first paint?",
    metrics: ["FCP", "LCP"],
    auditIds: ["render-blocking-insight"],
    fixId: "render-blocking-insight",
    tab: "timeline",
    read: ({ audit, failing }) => {
      const rows = tableItems(audit);
      const worst = Math.max(0, ...rows.map((row) => num(row.wastedMs) ?? 0));
      return {
        summary:
          failing && rows.length
            ? `${rows.length} render-blocking ${rows.length === 1 ? "request delays" : "requests delay"} the first paint by up to ${formatMs(worst)}.`
            : "No render-blocking requests found.",
      };
    },
  },
  {
    id: "layout-shifts",
    question: "Does the layout jump while loading?",
    metrics: ["CLS"],
    auditIds: ["cls-culprits-insight"],
    extraAudits: ["cumulative-layout-shift"],
    fixId: "cls-culprits-insight",
    tab: "audits",
    read: ({ audit, audits, failing }) => {
      const total = num(audits["cumulative-layout-shift"]?.numericValue) ?? 0;
      const rows = tableItems(audit).flatMap((t) =>
        Array.isArray(t.items) ? (t.items as TableItem[]) : [],
      );
      const worst = Math.max(
        0,
        ...rows.flatMap((row) =>
          (row.node as { value?: string } | undefined)?.value === "Total"
            ? []
            : [num(row.score) ?? 0],
        ),
      );
      return {
        summary: failing
          ? `Layout shifts add ${total.toFixed(3)} CLS; the worst single shift scores ${worst.toFixed(3)}.`
          : `Layout stays stable (CLS ${total.toFixed(3)}).`,
        evidence: [{ k: "Layout shift score", v: total.toFixed(3) }],
        cls: failing ? Math.max(worst, total) : 0,
      };
    },
  },
  {
    id: "unused-js",
    question: "Is unused JavaScript being shipped?",
    metrics: ["LCP", "TBT"],
    auditIds: ["unused-javascript"],
    fixId: "unused-javascript",
    tab: "resources",
    read: (ctx) =>
      bytesReading(
        ctx,
        (bytes) => `${bytes} of the JavaScript downloaded is never used on this page.`,
        "Little unused JavaScript.",
      ),
  },
  {
    id: "third-parties",
    question: "Are third-party scripts slowing the page?",
    metrics: ["TBT", "LCP"],
    auditIds: ["third-parties-insight"],
    fixId: "third-parties-insight",
    tab: "resources",
    read: ({ audit }) => {
      const { entities, transfer, mainThreadMs } = thirdPartyTotals(audit);
      const failing = mainThreadMs >= THIRD_PARTY_FAIL_MS;
      return {
        summary: entities.length
          ? `${entities.length} third-party ${entities.length === 1 ? "service uses" : "services use"} ${formatMs(mainThreadMs)} of main-thread time and ${formatBytes(transfer)} of transfer.`
          : "No third-party scripts found.",
        evidence: entities.slice(0, 4).map((e) => ({
          k: e.name,
          v: `${formatMs(e.mainThreadMs)} main thread · ${formatBytes(e.transfer)}`,
        })),
        ownEvidenceOnly: true,
        signal: mainThreadMs >= THIRD_PARTY_SIGNAL_MS,
        failing,
      };
    },
  },
  {
    id: "slow-ttfb",
    question: "Is the server slow to respond?",
    metrics: ["TTFB", "FCP", "LCP"],
    auditIds: ["document-latency-insight"],
    fixId: "document-latency-insight",
    tab: "timeline",
    read: ({ audit, item }) => {
      const lab = debugNum(audit, "serverResponseTime");
      const field = fieldP75(item).TTFB;
      const worst = Math.max(lab ?? 0, field?.value ?? 0);
      return {
        summary:
          `${lab !== null ? `The server answered in ${formatMs(lab)} in the lab test` : "No lab server timing"}` +
          `${field ? `; real users see ${field.display} at p75` : ""}.`,
        evidence: [
          ...(lab !== null ? [{ k: "Server response (lab)", v: formatMs(lab) }] : []),
          ...(field ? [{ k: `TTFB p75 (${field.scope})`, v: field.display }] : []),
        ],
        // Cost is the time over the 800 ms "good" limit.
        ms: Math.max(0, worst - TTFB_SIGNAL_MS),
        signal: worst >= TTFB_SIGNAL_MS,
      };
    },
  },
  {
    id: "request-chains",
    question: "Do requests wait on each other in long chains?",
    metrics: ["LCP"],
    auditIds: ["network-dependency-tree-insight"],
    fixId: "network-dependency-tree-insight",
    tab: "timeline",
    read: ({ audit, failing }) => {
      const tree = (tableItems(audit)[0]?.value ?? {}) as {
        chains?: Record<string, { children?: Record<string, unknown> }>;
        longestChain?: { duration?: unknown };
      };
      const depth = Math.max(0, ...Object.values(tree.chains ?? {}).map(chainDepth));
      const duration = num(tree.longestChain?.duration);
      const known = depth > 0 && duration !== null;
      return {
        summary:
          failing && known
            ? `The longest request chain is ${depth} requests deep and takes ${formatMs(duration)}.`
            : "No problematic request chains found.",
        evidence: known
          ? [
              { k: "Chain depth", v: `${depth} requests` },
              { k: "Longest chain", v: formatMs(duration) },
            ]
          : undefined,
        ownEvidenceOnly: true,
      };
    },
  },
  {
    id: "dom-size",
    question: "Is the page DOM too large?",
    metrics: ["INP"],
    auditIds: ["dom-size-insight"],
    fixId: "dom-size-insight",
    tab: "audits",
    read: ({ audit, failing }) => {
      const elements = debugNum(audit, "totalElements") ?? num(audit.numericValue);
      const depth = debugNum(audit, "maxDepth");
      const children = debugNum(audit, "maxChildren");
      return {
        summary:
          elements === null
            ? NO_DATA
            : `The page has ${elements.toLocaleString("en-US")} elements${depth !== null ? `, up to ${depth} levels deep` : ""}${failing ? ", more than Lighthouse recommends" : ""}.`,
        evidence: [
          ...(elements !== null ? [{ k: "Total elements", v: String(elements) }] : []),
          ...(depth !== null ? [{ k: "Max depth", v: String(depth) }] : []),
          ...(children !== null ? [{ k: "Max children", v: String(children) }] : []),
        ],
        ownEvidenceOnly: true,
      };
    },
  },
  {
    id: "caching",
    question: "Are static files cached poorly?",
    metrics: ["Repeat visits"],
    auditIds: ["cache-insight"],
    fixId: "cache-insight",
    tab: "weight",
    repeatVisitsOnly: true,
    read: (ctx) =>
      bytesReading(
        ctx,
        (bytes) => `${bytes} of assets have short cache lifetimes, which slows repeat visits.`,
        "Static files are cached well.",
      ),
  },
  {
    id: "legacy-js",
    question: "Is legacy JavaScript shipped to modern browsers?",
    metrics: ["TBT", "LCP"],
    auditIds: ["legacy-javascript-insight", "legacy-javascript"],
    fixId: "legacy-javascript-insight",
    tab: "resources",
    read: (ctx) =>
      bytesReading(
        ctx,
        (bytes) =>
          `${bytes} of JavaScript is polyfills and transforms modern browsers do not need.`,
        "No significant legacy JavaScript.",
      ),
  },
];

function costDisplay(ms: number | null, cls: number | null): string {
  const parts = [ms ? `-${formatMs(ms)}` : "", cls ? `CLS ${cls.toFixed(3)}` : ""].filter(Boolean);
  return parts.join(" · ") || "–";
}

/**
 * Verdict rules:
 * - Audit missing or notApplicable: ruled out, "No data in this report".
 * - Confirmed: the audit fails (insights: score is not 1; other audits: score < 0.5)
 *   and its largest metricSavings is >= 300 ms (LCP/FCP/TBT) or >= 0.05 (CLS);
 *   or a check-specific signal holds (TBT >= 200 ms, TTFB >= 800 ms in lab or field,
 *   third-party main-thread time >= 1 s).
 * - Contributes: the audit fails with smaller savings, or has any non-zero savings.
 * - Otherwise ruled out. Caching only affects repeat visits, so it is capped at contributes.
 */
function evaluate(check: Check, item: PageSpeedInsights): Hypothesis {
  const audits = item.lighthouseResult?.audits ?? {};
  const auditId = check.auditIds.find((id) => isUsable(audits[id]));
  const base = {
    id: check.id,
    question: check.question,
    metrics: check.metrics,
    fix: FIXES[check.fixId] ?? "See the raw audit for details.",
    tab: check.tab,
  };
  const audit = auditId ? audits[auditId] : undefined;
  if (!auditId || !audit) {
    return {
      ...base,
      verdict: "ruled-out",
      summary: NO_DATA,
      costMs: null,
      costCls: null,
      costDisplay: "–",
      evidence: [],
      sourceAudits: [],
      sourceLabel: "Not measured in this report",
      auditId: check.auditIds[0],
    };
  }

  const reading = check.read({
    audit,
    audits,
    item,
    failing: auditFails(auditId, audit),
  });
  const failing = reading.failing ?? auditFails(auditId, audit);
  const savings = audit.metricSavings ?? {};
  const ms = Math.max(savings.LCP ?? 0, savings.FCP ?? 0, savings.TBT ?? 0, reading.ms ?? 0);
  const cls = Math.max(savings.CLS ?? 0, reading.cls ?? 0);

  let verdict: Verdict = "ruled-out";
  if (reading.signal || (failing && (ms >= CONFIRM_MS || cls >= CONFIRM_CLS))) {
    verdict = "confirmed";
  } else if (failing || ms > 0 || cls > 0) {
    verdict = "contributes";
  }
  if (check.repeatVisitsOnly && verdict === "confirmed") verdict = "contributes";

  const sourceAudits = [auditId, ...(check.extraAudits ?? []).filter((id) => isUsable(audits[id]))];
  const evidence = [
    ...(reading.evidence ?? []),
    ...(reading.ownEvidenceOnly ? [] : auditEvidence(audit)),
  ].slice(0, MAX_EVIDENCE);
  const costMs = ms > 0 ? ms : null;
  const costCls = cls > 0 ? cls : null;
  return {
    ...base,
    verdict,
    summary: check.repeatVisitsOnly
      ? `${reading.summary.replace(/\.$/, "")} (repeat visits only).`
      : reading.summary,
    costMs,
    costCls,
    costDisplay: costDisplay(costMs, costCls),
    evidence,
    sourceAudits,
    sourceLabel: sourceAudits.map((id) => audits[id]?.title ?? id).join(", "),
    auditId,
  };
}

const VERDICT_ORDER: Record<Verdict, number> = { confirmed: 0, contributes: 1, "ruled-out": 2 };

/** ms items first (largest cost first), then CLS-only items, then the rest. */
function byCost(a: Hypothesis, b: Hypothesis): number {
  const rank = (h: Hypothesis) => (h.costMs ? 0 : h.costCls ? 1 : 2);
  return (
    rank(a) - rank(b) || (b.costMs ?? 0) - (a.costMs ?? 0) || (b.costCls ?? 0) - (a.costCls ?? 0)
  );
}

/** Runs every check against one report, confirmed causes first. */
export function buildTriage(item: PageSpeedInsights): Hypothesis[] {
  return CHECKS.map((check) => evaluate(check, item)).sort(
    (a, b) => VERDICT_ORDER[a.verdict] - VERDICT_ORDER[b.verdict] || byCost(a, b),
  );
}

export function triagePage(item: PageSpeedInsights): { url: string; formFactor: string } {
  return {
    url: item.lighthouseResult?.finalUrl ?? item.lighthouseResult?.requestedUrl ?? "",
    formFactor: formFactorOf(item),
  };
}

/** Markdown brief for an AI coding agent to fix every confirmed cause. */
export function triagePrompt(item: PageSpeedInsights, hypotheses: Hypothesis[]): string {
  const confirmed = hypotheses.filter((h) => h.verdict === "confirmed");
  const { url, formFactor } = triagePage(item);
  const lines = [
    `# Fix: ${confirmed.length} confirmed performance ${confirmed.length === 1 ? "cause" : "causes"}`,
    "",
    `- Page: ${url}`,
    `- Device: ${formFactor}`,
  ];
  confirmed.forEach((h, i) => {
    lines.push(
      "",
      `## ${i + 1}. ${h.question}`,
      `- Metrics: ${h.metrics.join(", ")}`,
      ...(h.sourceAudits.length ? [`- Lighthouse audits: ${h.sourceAudits.join(", ")}`] : []),
      "",
      `Problem: ${h.summary}`,
    );
    if (h.evidence.length) {
      lines.push("", "Evidence:", ...h.evidence.map(({ k, v }) => `- ${k}: ${v}`));
    }
    lines.push("", `Suggested fix: ${h.fix}`);
  });
  lines.push(
    "",
    "## Verify",
    "Re-run Lighthouse (PageSpeed Insights) on the same page and device, and confirm the metrics and these audits improve.",
  );
  return lines.join("\n");
}
