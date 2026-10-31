import { AuditResultsRecord } from "@/lib/schema";
import { cn } from "@/lib/utils";
import { getAuditStatus, type AuditStatus } from "@/features/page-speed-insights/lh-categories/auditStatus";

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
