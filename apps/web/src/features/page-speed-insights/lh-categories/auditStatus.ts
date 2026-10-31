import type { AuditResultsRecord } from "@/lib/schema";

type Audit = AuditResultsRecord[string];

export type AuditStatus =
  | "fail"
  | "average"
  | "pass"
  | "informative"
  | "manual"
  | "notApplicable"
  | "error";

/** Lighthouse thresholds. */
const PASS_THRESHOLD = 0.9;
const AVERAGE_THRESHOLD = 0.5;

/** Order sections are displayed in. */
const STATUS_DISPLAY_ORDER: AuditStatus[] = [
  "fail",
  "average",
  "pass",
  "informative",
  "manual",
  "notApplicable",
  "error",
];

/** Lower = worse. Used to pick the worst status across reports. */
const STATUS_SEVERITY: Record<AuditStatus, number> = {
  fail: 0,
  error: 1,
  average: 2,
  manual: 3,
  pass: 4,
  informative: 5,
  notApplicable: 6,
};

const STATUS_TITLES: Record<AuditStatus, string> = {
  fail: "Failed",
  average: "Needs attention",
  pass: "Passed",
  informative: "Informative",
  manual: "Manual checks",
  notApplicable: "Not applicable",
  error: "Errors",
};

/** Sections that start collapsed so failing audits are seen first. */
const COLLAPSED_BY_DEFAULT: ReadonlySet<AuditStatus> = new Set(["pass", "notApplicable", "manual"]);

/** Status of a single audit result, or null when there is no result. */
export function getAuditStatus(audit: Audit | null | undefined): AuditStatus | null {
  if (!audit || !audit.scoreDisplayMode) return null;
  switch (audit.scoreDisplayMode) {
    case "notApplicable":
      return "notApplicable";
    case "manual":
      return "manual";
    case "informative":
      return "informative";
    case "error":
      return "error";
    default: {
      const score = audit.score;
      if (score === null || score === undefined) return "informative";
      if (score >= PASS_THRESHOLD) return "pass";
      if (score >= AVERAGE_THRESHOLD) return "average";
      return "fail";
    }
  }
}

/** Worst status across reports; null if no report has a result. */
function getWorstStatus(statuses: (AuditStatus | null | undefined)[]): AuditStatus | null {
  let worst: AuditStatus | null = null;
  for (const s of statuses) {
    if (!s) continue;
    if (worst === null || STATUS_SEVERITY[s] < STATUS_SEVERITY[worst]) worst = s;
  }
  return worst;
}

function getWorstAuditStatus(audits: (Audit | null | undefined)[]): AuditStatus | null {
  return getWorstStatus(audits.map(getAuditStatus));
}

const DISAGREEMENT_VERBS: Partial<Record<AuditStatus, string>> = {
  fail: "Fails",
  average: "Needs attention",
};

function joinLabels(labels: string[]) {
  return labels.length <= 2
    ? labels.join(" and ")
    : `${labels.slice(0, -1).join(", ")} and ${labels.at(-1)}`;
}

/**
 * Text describing disagreement between reports, or null when there is only one
 * report (with a result) or all reports agree.
 */
export function getDisagreementText(
  audits: (Audit | null | undefined)[],
  labels: string[],
): string | null {
  const entries = audits
    .map((audit, i) => ({
      status: getAuditStatus(audit),
      label: labels[i] || `Report ${i + 1}`,
    }))
    .filter((e): e is { status: AuditStatus; label: string } => e.status !== null);
  if (entries.length < 2) return null;
  if (new Set(entries.map((e) => e.status)).size < 2) return null;

  const worst = getWorstStatus(entries.map((e) => e.status));
  const verb = worst ? DISAGREEMENT_VERBS[worst] : undefined;
  if (worst && verb) {
    const worstLabels = entries.filter((e) => e.status === worst).map((e) => e.label);
    if (worstLabels.length < entries.length) {
      return `${verb} on ${joinLabels(worstLabels)} only`;
    }
  }
  return "Differs across reports";
}

export type StatusSection<T> = {
  status: AuditStatus;
  title: string;
  items: T[];
  defaultOpen: boolean;
};

/** Partition items into ordered status sections (empty sections are omitted). Item order is kept. */
export function partitionByStatus<T>(
  items: T[],
  getAudits: (item: T) => (Audit | null | undefined)[],
): StatusSection<T>[] {
  const buckets = new Map<AuditStatus, T[]>();
  for (const item of items) {
    const status = getWorstAuditStatus(getAudits(item)) ?? "informative";
    const list = buckets.get(status) ?? [];
    list.push(item);
    buckets.set(status, list);
  }
  return STATUS_DISPLAY_ORDER.filter((s) => buckets.has(s)).map((status) => ({
    status,
    title: STATUS_TITLES[status],
    items: buckets.get(status) ?? [],
    defaultOpen: !COLLAPSED_BY_DEFAULT.has(status),
  }));
}

/** e.g. "3 failed · 2 needs attention · 40 passed". Zero counts are omitted. */
export function formatCategorySummary(
  sections: Pick<StatusSection<unknown>, "status" | "items">[],
) {
  const count = (status: AuditStatus) =>
    sections.find((s) => s.status === status)?.items.length ?? 0;
  const parts: string[] = [];
  if (count("fail")) parts.push(`${count("fail")} failed`);
  if (count("average")) parts.push(`${count("average")} needs attention`);
  if (count("pass")) parts.push(`${count("pass")} passed`);
  return parts.join(" · ");
}
