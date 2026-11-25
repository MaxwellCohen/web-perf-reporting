import { ReportColumn, ReportColumns } from "@/features/page-speed-insights/shared/ReportColumns";
import { formatBytes, formatMs } from "@/features/page-speed-insights/shared/format";
import { cn } from "@/lib/utils";

type KpiFormat = "count" | "bytes" | "ms" | "cls" | "throughput" | "score";

function formatKpi(value: number, format: KpiFormat): string {
  switch (format) {
    case "bytes":
      return formatBytes(value);
    case "ms":
      return formatMs(value);
    case "cls":
    case "score":
      return value.toFixed(3);
    case "throughput":
      return `${formatBytes(value)}/s`;
    case "count":
    default:
      return Math.round(value).toLocaleString();
  }
}

export type AuditKpi = {
  label: string;
  value: number;
  format: KpiFormat;
};

export function AuditKpiStrip({
  groups,
}: {
  groups: Array<{ reportLabel: string; metrics: AuditKpi[] }>;
}) {
  const nonempty = groups.filter((group) => group.metrics.length > 0);
  if (!nonempty.length) return null;

  const multi = nonempty.length > 1;

  return (
    <ReportColumns>
      {nonempty.map((group) => (
        <ReportColumn key={group.reportLabel} label={group.reportLabel} showLabel={multi}>
          <div
            className={cn(
              "grid gap-2",
              // Five across only fits when one report has the full width.
              group.metrics.length >= 5 && !multi
                ? "grid-cols-2 sm:grid-cols-3 lg:grid-cols-5"
                : "grid-cols-2 sm:grid-cols-3",
            )}
          >
            {group.metrics.map((metric) => (
              <div
                key={`${group.reportLabel}-${metric.label}`}
                className="rounded-lg border bg-muted/20 px-3 py-2"
              >
                <p className="text-xs text-muted-foreground">{metric.label}</p>
                <p className="font-mono text-lg font-semibold tabular-nums">
                  {formatKpi(metric.value, metric.format)}
                </p>
              </div>
            ))}
          </div>
        </ReportColumn>
      ))}
    </ReportColumns>
  );
}
