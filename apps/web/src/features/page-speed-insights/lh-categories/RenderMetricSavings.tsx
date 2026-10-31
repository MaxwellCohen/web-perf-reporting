"use client";

import { Details } from "@/components/ui/accordion";
import { formatMs } from "@/features/page-speed-insights/shared/format";
import { AuditResultsRecord } from "@/lib/schema";

/** Format a savings value for a metric: CLS is unitless, everything else is milliseconds. */
function formatMetricSaving(metric: string, value: number): string {
  const sign = value < 0 ? "+" : "−";
  const abs = Math.abs(value);
  if (metric === "CLS") {
    return `${sign}${Number(abs.toFixed(3))}`;
  }
  return `${sign}${formatMs(abs)}`;
}

export function RenderMetricSavings({
  auditData,
  labels,
}: {
  auditData?: (AuditResultsRecord[string] | null)[];

  labels: string[];
}) {
  const reports = (auditData ?? [])
    .map((a, i) => ({ metricSavings: a?.metricSavings, label: labels[i] || "" }))
    .filter((a) => a.metricSavings);

  // Hide metrics where every report has 0 savings.
  const metrics = [...new Set(reports.flatMap((r) => Object.keys(r.metricSavings || {})))].filter(
    (metric) => reports.some((r) => (r.metricSavings?.[metric] ?? 0) !== 0),
  );

  if (metrics.length === 0) {
    return null;
  }

  const multiple = (auditData?.length ?? 0) > 1;

  return (
    <Details>
      <summary className="flex flex-col gap-2">
        <h4 className="text-md font-bold">Possible Metric Savings</h4>
      </summary>
      <div className="flex flex-col gap-2 py-2">
        {reports.map((report, i) => {
          const chips = metrics.filter((m) => (report.metricSavings?.[m] ?? 0) !== 0);
          if (chips.length === 0) return null;
          return (
            <div key={`${i}_${report.label}`} className="flex flex-wrap items-center gap-2">
              {multiple && report.label ? (
                <span className="min-w-20 text-sm font-semibold">{report.label}</span>
              ) : null}
              <ul className="flex flex-wrap gap-2">
                {chips.map((metric) => (
                  <li
                    key={metric}
                    className="rounded-full border border-emerald-600/40 bg-emerald-500/15 px-2.5 py-0.5 text-xs font-medium tabular-nums text-emerald-800 dark:text-emerald-300"
                  >
                    {metric} {formatMetricSaving(metric, report.metricSavings?.[metric] ?? 0)}
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>
    </Details>
  );
}
