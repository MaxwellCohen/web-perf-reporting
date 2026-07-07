"use client";
import { TableCell, TableHead, TableRow } from "@/components/ui/table";
import { RenderMSValue } from "@/features/page-speed-insights/lh-categories/table/RenderTableValue";
import { WideMetricsSummaryCardTable } from "@/features/page-speed-insights/shared/WideMetricsSummaryCardTable";
import {
  computeTaskSummaryStats,
  type TaskSummaryData,
} from "@/features/page-speed-insights/javascript-metrics/taskSummaryStats";

type TaskSummaryCardProps = {
  metrics: TaskSummaryData[];
};

export function TaskSummaryCard({ metrics }: TaskSummaryCardProps) {
  const stats = computeTaskSummaryStats(metrics);

  const validStats = stats.filter((s) => s.totalTasks > 0);

  if (!validStats.length) {
    return null;
  }

  const showReportColumn = validStats.length > 1;

  return (
    <WideMetricsSummaryCardTable
      title="Task Summary"
      tableClassName="table-auto min-w-full"
      header={
        <TableRow>
          {showReportColumn && (
            <TableHead className="min-w-24 whitespace-nowrap px-3">Report</TableHead>
          )}
          <TableHead className="min-w-28 whitespace-nowrap px-3">Total Tasks</TableHead>
          <TableHead className="min-w-24 whitespace-nowrap px-3">Total Time</TableHead>
          <TableHead className="min-w-28 whitespace-nowrap px-3">Avg Duration</TableHead>
          <TableHead className="min-w-28 whitespace-nowrap px-3">Longest Task</TableHead>
          <TableHead className="min-w-20 whitespace-nowrap px-3 text-center">&gt;10ms</TableHead>
          <TableHead className="min-w-20 whitespace-nowrap px-3 text-center">&gt;25ms</TableHead>
          <TableHead className="min-w-20 whitespace-nowrap px-3 text-center">&gt;50ms</TableHead>
          <TableHead className="min-w-24 whitespace-nowrap px-3 text-center">&gt;100ms</TableHead>
          <TableHead className="min-w-24 whitespace-nowrap px-3 text-center">&gt;500ms</TableHead>
        </TableRow>
      }
    >
      {validStats.map((stat) => (
        <TableRow key={stat.label}>
          {showReportColumn && (
            <TableCell className="font-medium px-3">{stat.label || "Unknown"}</TableCell>
          )}
          <TableCell className="px-3">{stat.totalTasks}</TableCell>
          <TableCell className="px-3">
            <RenderMSValue value={stat.totalTaskTime} />
          </TableCell>
          <TableCell className="px-3">
            <RenderMSValue value={stat.averageTaskDuration} />
          </TableCell>
          <TableCell className="px-3">
            <RenderMSValue value={stat.longestTaskDuration} />
          </TableCell>
          <TableCell className="px-3 text-center">{stat.numTasksOver10ms}</TableCell>
          <TableCell className="px-3 text-center">{stat.numTasksOver25ms}</TableCell>
          <TableCell className="px-3 text-center">{stat.numTasksOver50ms}</TableCell>
          <TableCell className="px-3 text-center">{stat.numTasksOver100ms}</TableCell>
          <TableCell className="px-3 text-center">{stat.numTasksOver500ms}</TableCell>
        </TableRow>
      ))}
    </WideMetricsSummaryCardTable>
  );
}
