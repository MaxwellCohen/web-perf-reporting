"use client";

import { TableCardShell } from "@/features/page-speed-insights/shared/TableCard";
import { MainThreadWorkBreakdownTable } from "@/features/page-speed-insights/javascript-metrics/MainThreadWorkBreakdownTable";
import {
  buildMainThreadWorkTable,
  type MainThreadWorkMetric,
} from "@/features/page-speed-insights/javascript-metrics/mainThreadWorkTable";

type MainThreadWorkCardProps = {
  metrics: MainThreadWorkMetric[];
};

export function MainThreadWorkCard({ metrics }: MainThreadWorkCardProps) {
  const { rows, reportLabels } = buildMainThreadWorkTable(metrics);

  if (!rows.length) {
    return null;
  }

  return (
    <TableCardShell title="Main Thread Work Breakdown" className="md:col-span-2 lg:col-span-3">
      <div className="w-full overflow-x-auto">
        <MainThreadWorkBreakdownTable rows={rows} reportLabels={reportLabels} />
      </div>
    </TableCardShell>
  );
}
