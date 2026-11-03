import type { AuditResultsRecord } from "@/lib/schema";
import { getNumber } from "@/lib/utils";
import type { LighthouseSaving } from "./timelineSourceTypes";

export function lighthouseSavings(audits: AuditResultsRecord | undefined): LighthouseSaving[] {
  if (!audits) return [];
  const savings: LighthouseSaving[] = [];
  for (const [id, audit] of Object.entries(audits)) {
    if (!audit || audit.scoreDisplayMode === "notApplicable") continue;
    const details = audit.details as { overallSavingsBytes?: unknown } | undefined;
    const bytes = getNumber(details?.overallSavingsBytes);
    const fcpMs = getNumber(audit.metricSavings?.FCP);
    const lcpMs = getNumber(audit.metricSavings?.LCP);
    if (!(bytes && bytes > 0) && !(fcpMs && fcpMs > 0) && !(lcpMs && lcpMs > 0)) continue;
    savings.push({ id, title: audit.title ?? id, bytes, fcpMs, lcpMs });
  }
  return savings;
}
