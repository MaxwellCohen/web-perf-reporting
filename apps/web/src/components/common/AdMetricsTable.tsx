"use client";

import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { CruxReport } from "@/lib/schema";
import { cn } from "@/lib/utils";

type CruxMetrics = CruxReport["record"]["metrics"];

// CrUX ad metrics are experimental, p75 only, and have no good/poor thresholds.
const adMetrics = [
  { key: "experimental_ad_count", label: "Ad Count", format: (v: number) => v.toFixed(2) },
  { key: "experimental_ad_density", label: "Ad Density", format: (v: number) => `${v}%` },
  {
    key: "experimental_ad_kilobytes",
    label: "Ad Weight (Network)",
    format: (v: number) => `${v.toLocaleString()} KB`,
  },
  {
    key: "experimental_ad_cpu",
    label: "Ad Weight (CPU)",
    format: (v: number) => `${v.toLocaleString()} ms`,
  },
] as const;

export function AdMetricsTable({
  metrics,
  className,
  dateRange,
}: {
  metrics?: CruxMetrics;
  className?: string;
  dateRange?: string;
}) {
  const entries = adMetrics.flatMap(({ key, label, format }) => {
    const p75 = metrics?.[key]?.percentiles?.p75;
    return p75 === undefined || Number.isNaN(p75) ? [] : [{ key, label, value: format(p75) }];
  });
  if (!entries.length) {
    return null;
  }
  return (
    <Card className={cn("flex-1", className)}>
      <div className="text-md text-center font-bold">Ad Experience (P75, experimental)</div>
      {dateRange && (
        <div className="text-xs text-center text-muted-foreground mb-1">{dateRange}</div>
      )}
      <Table>
        <TableHeader className="pt-2">
          <TableRow>
            {entries.map(({ key, label }) => (
              <TableHead key={key} className="h-4">
                {label}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow>
            {entries.map(({ key, value }) => (
              <TableCell key={key} className="h-4">
                {value}
              </TableCell>
            ))}
          </TableRow>
        </TableBody>
      </Table>
    </Card>
  );
}
