"use client";

import { useMemo } from "react";
import type { TableItem } from "@/lib/schema";
import { getNumber } from "@/lib/utils";
import { createStringAggregatedCell } from "@/features/page-speed-insights/shared/aggregatedCellHelpers";
import { sortByMaxValue } from "@/features/page-speed-insights/shared/dataSortingHelpers";
import type { StockColumnDef } from "@/features/page-speed-insights/shared/tanstackStockTypes";
import { TableCard } from "@/features/page-speed-insights/shared/TableCard";
import { createMSColumn } from "@/features/page-speed-insights/shared/tableColumnHelpers";
import { useTableColumns } from "@/features/page-speed-insights/shared/useTableColumns";
import { toTitleCase } from "@/features/page-speed-insights/toTitleCase";
import { createStockColumnHelper } from "@/features/page-speed-insights/tanstack-table-v9/createStockColumnHelper";
import { useStandardTable } from "@/features/page-speed-insights/tanstack-table-v9/useStandardTable";

type MainThreadWorkData = {
  label: string;
  mainThreadWork: TableItem[];
};

type MainThreadWorkTableRow = {
  label: string;
  group: string;
  groupLabel: string;
  duration: number | undefined;
};

type MainThreadWorkCardProps = {
  metrics: MainThreadWorkData[];
};

const columnHelper = createStockColumnHelper<MainThreadWorkTableRow>();
const cols: StockColumnDef<MainThreadWorkTableRow, any>[] = [
  columnHelper.accessor("groupLabel", {
    id: "groupLabel",
    header: "Category",
    enableSorting: true,
    enableGrouping: true,
    enableResizing: true,
    filterFn: "includesString",
    aggregationFn: "unique",
    cell: (info) => info.getValue(),
    aggregatedCell: createStringAggregatedCell("groupLabel", undefined, false),
  }),
  createMSColumn(columnHelper, "duration", "Time Spent"),
];

export function MainThreadWorkCard({ metrics }: MainThreadWorkCardProps) {
  const validMetrics = useMemo(() => metrics.filter((m) => m.mainThreadWork.length > 0), [metrics]);
  const showReportColumn = validMetrics.length > 1;

  const data = useMemo<MainThreadWorkTableRow[]>(() => {
    const allRows = validMetrics.flatMap(({ label, mainThreadWork }) =>
      mainThreadWork.map((item: TableItem) => {
        const group = typeof item.group === "string" ? item.group : "";
        const groupLabel = typeof item.groupLabel === "string" ? item.groupLabel : group;
        const duration = getNumber(item.duration);
        return {
          label,
          group,
          groupLabel: groupLabel || toTitleCase(group),
          duration,
        };
      }),
    );

    return sortByMaxValue(
      allRows,
      (row) => row.groupLabel,
      (row) => row.duration || 0,
      validMetrics.length,
    );
  }, [validMetrics]);

  const columns = useTableColumns<MainThreadWorkTableRow>(cols, columnHelper, showReportColumn);

  const table = useStandardTable({
    data,
    columns,
    grouping: ["groupLabel"],
  });

  if (!validMetrics.length) {
    return null;
  }

  return <TableCard title="Main Thread Work Breakdown" table={table} />;
}
