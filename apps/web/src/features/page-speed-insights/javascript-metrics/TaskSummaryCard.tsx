"use client";
import { useMemo } from "react";
import { createStockColumnHelper } from "@/features/page-speed-insights/tanstack-table-v9/createStockColumnHelper";
import {
  useStandardTable,
  type StandardColumnDef,
} from "@/features/page-speed-insights/tanstack-table-v9/useStandardTable";
import { createMSColumn } from "@/features/page-speed-insights/shared/tableColumnHelpers";
import { useTableColumns } from "@/features/page-speed-insights/shared/useTableColumns";
import { TableCard } from "@/features/page-speed-insights/shared/TableCard";
import {
  computeTaskSummaryStats,
  type TaskSummaryData,
} from "@/features/page-speed-insights/javascript-metrics/taskSummaryStats";

type TaskSummaryCardProps = {
  metrics: TaskSummaryData[];
};

type TaskSummaryRow = ReturnType<typeof computeTaskSummaryStats>[number];

const columnHelper = createStockColumnHelper<TaskSummaryRow>();

function countColumn(accessor: keyof TaskSummaryRow & string, header: string): StandardColumnDef<TaskSummaryRow> {
  return columnHelper.accessor(accessor, {
    id: accessor,
    header,
    enableSorting: true,
    enableResizing: true,
    filterFn: "inNumberRange",
  });
}

const cols: StandardColumnDef<TaskSummaryRow>[] = [
  countColumn("totalTasks", "Total Tasks"),
  createMSColumn(columnHelper, "totalTaskTime", "Total Time"),
  createMSColumn(columnHelper, "averageTaskDuration", "Avg Duration"),
  createMSColumn(columnHelper, "longestTaskDuration", "Longest Task"),
  countColumn("numTasksOver10ms", ">10ms"),
  countColumn("numTasksOver25ms", ">25ms"),
  countColumn("numTasksOver50ms", ">50ms"),
  countColumn("numTasksOver100ms", ">100ms"),
  countColumn("numTasksOver500ms", ">500ms"),
];

export function TaskSummaryCard({ metrics }: TaskSummaryCardProps) {
  const validStats = useMemo(
    () => computeTaskSummaryStats(metrics).filter((s) => s.totalTasks > 0),
    [metrics],
  );
  const showReportColumn = validStats.length > 1;
  const columns = useTableColumns(cols, columnHelper, showReportColumn);
  const table = useStandardTable({ data: validStats, columns });

  if (!validStats.length) {
    return null;
  }

  return (
    <TableCard title="Task Summary" table={table} className="md:col-span-2 lg:col-span-3" />
  );
}
