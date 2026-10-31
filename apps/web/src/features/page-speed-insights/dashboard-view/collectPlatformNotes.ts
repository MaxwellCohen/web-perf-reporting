import type { AuditResult, AuditResultsRecord, TableItem } from "@/lib/schema";

const FEATURE_LINK_LIMIT = 8;

export type BaselineTier = "limited" | "newly" | "widely";

export type BaselineFeatureNote = {
  id: string;
  href: string | null;
  tier: BaselineTier;
  statusLabel: string;
};

export type BaselineNote = {
  asOf: string | null;
  counts: Record<BaselineTier, number>;
  highlighted: BaselineFeatureNote[];
  hiddenHighlightCount: number;
  newest: { id: string; year: string } | null;
};

export type CspFindingNote = {
  description: string;
  severity: string | null;
  directive: string | null;
};

export type PlatformNotes = {
  baseline: BaselineNote | null;
  csp: CspFindingNote[];
};

function displayText(value: unknown): string | null {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }
  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value);
  }
  if (!value || typeof value !== "object") {
    return null;
  }
  if ("formattedDefault" in value && typeof value.formattedDefault === "string") {
    return displayText(value.formattedDefault);
  }
  if ("displayString" in value) {
    return displayText(value.displayString);
  }
  if ("text" in value && typeof value.text === "string") {
    return displayText(value.text);
  }
  if ("value" in value) {
    return displayText(value.value);
  }
  return null;
}

function tableItems(audit: AuditResult | undefined): TableItem[] {
  const details = audit?.details;
  if (!details || details.type !== "table") {
    return [];
  }
  return details.items ?? [];
}

function isNotApplicable(audit: AuditResult | undefined): boolean {
  return audit?.scoreDisplayMode?.toLowerCase() === "notapplicable";
}

function baselineTier(status: unknown, label: string | null): BaselineTier {
  if (status === "limited") return "limited";
  if (status === "low") return "newly";
  if (status === "high") return "widely";
  const text = (label ?? "").toLowerCase();
  if (text.includes("limited")) return "limited";
  if (text.includes("newly")) return "newly";
  return "widely";
}

function featureHref(value: unknown, featureId: string): string | null {
  if (value && typeof value === "object" && "url" in value && typeof value.url === "string") {
    return value.url;
  }
  return featureId ? `https://webstatus.dev/features/${featureId}` : null;
}

function asOfDate(description: string | undefined): string | null {
  const match = description?.match(/as of (\d{4}-\d{2}-\d{2})/i);
  return match?.[1] ?? null;
}

const TIER_ORDER: Record<BaselineTier, number> = { limited: 0, newly: 1, widely: 2 };

function collectBaselineNote(audit: AuditResult | undefined): BaselineNote | null {
  if (!audit || isNotApplicable(audit)) {
    return null;
  }

  const features: BaselineFeatureNote[] = [];
  for (const item of tableItems(audit)) {
    const id = displayText(item.featureId);
    if (!id) continue;
    const statusLabel = displayText(item.displayStatus) ?? "Widely available";
    const status =
      item.displayStatus && typeof item.displayStatus === "object" && "status" in item.displayStatus
        ? item.displayStatus.status
        : null;
    features.push({
      id,
      href: featureHref(item.featureId, id),
      tier: baselineTier(status, statusLabel),
      statusLabel,
    });
  }

  if (features.length === 0) {
    return null;
  }

  const counts: Record<BaselineTier, number> = { limited: 0, newly: 0, widely: 0 };
  for (const feature of features) {
    counts[feature.tier] += 1;
  }

  const highlightedSource = features
    .filter((feature) => feature.tier !== "widely")
    .sort((a, b) => TIER_ORDER[a.tier] - TIER_ORDER[b.tier]);
  const highlighted = highlightedSource.slice(0, FEATURE_LINK_LIMIT);

  const debugData =
    audit.details && "debugData" in audit.details ? audit.details.debugData : undefined;
  const newestId = displayText(debugData?.newestFeatureId);
  const newestYear = displayText(debugData?.newestFeatureYear);

  return {
    asOf: asOfDate(audit.description),
    counts,
    highlighted,
    hiddenHighlightCount: Math.max(0, highlightedSource.length - highlighted.length),
    newest: newestId && newestYear ? { id: newestId, year: newestYear } : null,
  };
}

function findingFromItem(item: TableItem): CspFindingNote | null {
  const description = displayText(item.description);
  if (!description) return null;
  return {
    description,
    severity: displayText(item.severity),
    directive: displayText(item.directive),
  };
}

function collectCspFindings(audit: AuditResult | undefined): CspFindingNote[] {
  if (!audit || isNotApplicable(audit)) {
    return [];
  }

  const findings: CspFindingNote[] = [];
  for (const item of tableItems(audit)) {
    const finding = findingFromItem(item);
    if (finding) findings.push(finding);
    for (const subItem of item.subItems?.items ?? []) {
      const subFinding = findingFromItem(subItem);
      if (subFinding) findings.push(subFinding);
    }
  }
  return findings;
}

export function collectPlatformNotes(audits: AuditResultsRecord | undefined): PlatformNotes | null {
  if (!audits) return null;
  const baseline = collectBaselineNote(audits.baseline);
  const csp = collectCspFindings(audits["csp-xss"]);
  if (!baseline && csp.length === 0) return null;
  return { baseline, csp };
}
