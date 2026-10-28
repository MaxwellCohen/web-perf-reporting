import { AuditResultsRecord } from "@/lib/schema";
import { cn } from "@/lib/utils";
import { getAuditStatus, type AuditStatus } from "@/features/page-speed-insights/lh-categories/auditStatus";

export const ScoreDisplayModes = {
  /** Scores of 0-1 (map to displayed scores of 0-100). */
  NUMERIC: "numeric",
  /** Pass/fail audit (0 and 1 are only possible scores). */
  BINARY: "binary",
  /**
   * Audit result score is determined by the metric savings and product score:
   * 1   - audit passed based on product score
   * 0.5 - audit failed and had no metric savings
   * 0   - audit failed and had metric savings
   */
  METRIC_SAVINGS: "metricSavings",
  /** The audit exists only to tell you to review something yourself. Score is null and should be ignored. */
  MANUAL: "manual",
  /** The audit is an FYI only, and can't be interpreted as pass/fail. Score is null and should be ignored. */
  INFORMATIVE: "informative",
  /** The audit turned out to not apply to the page. Score is null and should be ignored. */
  NOT_APPLICABLE: "notApplicable",
  /** There was an error while running the audit (check `errorMessage` for details). Score is null and should be ignored. */
  ERROR: "error",
} as const;

const ScoreDisplayModesRanking: Record<
  AuditResultsRecord[string]["scoreDisplayMode"] | "empty",
  number
> = {
  metricSavings: 1,
  numeric: 2,
  binary: 3,
  informative: 4,
  manual: 5,
  empty: 6,
  error: 7,
  notApplicable: 8,
} as const;

export function isEmptyResult(auditData?: AuditResultsRecord[string] | null) {
  if (!auditData) {
    return true;
  }
  if (auditData?.details?.type === "table" && auditData?.details.items?.length === 0) {
    return true;
  }
  if (auditData?.details?.type === "opportunity" && auditData?.details.items?.length === 0) {
    return true;
  }

  return !auditData?.details;
}

export const sortByScoreDisplayModes = (
  a: AuditResultsRecord[string] | undefined,
  b: AuditResultsRecord[string] | undefined,
) => {
  if (!a || !b) {
    return -1;
  }

  const scoreDisplayModeDiff =
    ScoreDisplayModesRanking[isEmptyResult(a) ? "empty" : a.scoreDisplayMode || "notApplicable"] -
    ScoreDisplayModesRanking[isEmptyResult(b) ? "empty" : b.scoreDisplayMode || "notApplicable"];
  if (scoreDisplayModeDiff === 0) {
    const scoreDiff = (a.score || 0) - (b.score || 0);
    return scoreDiff;
  }

  return scoreDisplayModeDiff;
};

const STATUS_BADGE_STYLES: Record<AuditStatus, string> = {
  pass: "border-emerald-600/40 bg-emerald-500/15 text-emerald-800 dark:text-emerald-300",
  average: "border-amber-600/40 bg-amber-500/15 text-amber-800 dark:text-amber-300",
  fail: "border-red-600/40 bg-red-500/15 text-red-800 dark:text-red-300",
  informative: "border-border bg-muted text-muted-foreground",
  manual: "border-border bg-muted text-muted-foreground",
  notApplicable: "border-border bg-muted text-muted-foreground",
  error: "border-red-600/40 bg-red-500/15 text-red-800 dark:text-red-300",
};

const STATUS_BADGE_TEXT: Record<AuditStatus, string> = {
  pass: "Pass",
  average: "Average",
  fail: "Fail",
  informative: "Info",
  manual: "Manual",
  notApplicable: "N/A",
  error: "Error",
};

/**
 * Compact status badge for one report's audit result. `device` (the report label)
 * should only be passed when more than one report is shown.
 */
export function ScoreDisplay({
  audit,
  device,
}: {
  audit?: AuditResultsRecord[string];
  device?: string;
}) {
  if (!audit) {
    return null;
  }
  if (audit.scoreDisplayMode === undefined) {
    return null;
  }
  const status = getAuditStatus(audit);
  if (!status) return null;
  // Informative audits carry no pass/fail signal; only show them if they have a value.
  if (status === "informative" && !audit.displayValue) return null;

  const showScore =
    audit.score !== null && audit.score !== undefined && audit.scoreDisplayMode === "numeric";
  const text =
    status === "error"
      ? audit.errorMessage || "Error"
      : STATUS_BADGE_TEXT[status] + (showScore ? ` ${Math.round(audit.score! * 100)}` : "");

  return (
    <div className="flex flex-wrap items-center gap-1.5 text-xs font-normal" data-status={status}>
      <span
        className={cn(
          "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 font-semibold",
          STATUS_BADGE_STYLES[status],
        )}
      >
        {device ? <span className="font-bold">{device}:</span> : null}
        {text}
      </span>
      {audit.displayValue && status !== "error" ? (
        <span className="text-muted-foreground">{audit.displayValue}</span>
      ) : null}
    </div>
  );
}
