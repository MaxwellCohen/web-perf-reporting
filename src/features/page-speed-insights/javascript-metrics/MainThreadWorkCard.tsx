"use client";
import { TableItem } from "@/lib/schema";
import { getNumber } from "@/lib/utils";
import { useMemo } from "react";
import {
  ColumnDef,
  createColumnHelper,
} from "@tanstack/react-table";
import { toTitleCase } from "@/features/page-speed-insights/toTitleCase";
import { createStringAggregatedCell } from "@/features/page-speed-insights/shared/aggregatedCellHelpers";
import { sortByMaxValue } from "@/features/page-speed-insights/shared/dataSortingHelpers";
import { useStandardTable } from "@/features/page-speed-insights/shared/tableConfigHelpers";
import { createMSColumn } from "@/features/page-speed-insights/shared/tableColumnHelpers";
import { useTableColumns } from "@/features/page-speed-insights/shared/useTableColumns";
import { TableCard } from "@/features/page-speed-insights/shared/TableCard";

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

const columnHelper = createColumnHelper<MainThreadWorkTableRow>();
const cols: ColumnDef<MainThreadWorkTableRow, unknown>[] = [
  columnHelper.accessor('groupLabel', {
    id: 'groupLabel',
    header: 'Category',
    enableSorting: true,
    enableGrouping: true,
    enableResizing: true,
    filterFn: 'includesString',
    aggregationFn: 'unique',
    cell: (info) => info.getValue(),
    aggregatedCell: createStringAggregatedCell('groupLabel', undefined, false),
  }),
  createMSColumn(columnHelper, 'duration', 'Time Spent'),
];

export function MainThreadWorkCard({ metrics }: MainThreadWorkCardProps) {
  "use no memo";
  const validMetrics = useMemo(() => metrics.filter(m => m.mainThreadWork.length > 0), [metrics]);
  const showReportColumn = validMetrics.length > 1;

  // Combine all main thread work data with labels
  const data = useMemo<MainThreadWorkTableRow[]>(() => {
    const allRows = validMetrics.flatMap(({ label, mainThreadWork }) =>
      mainThreadWork.map((item: TableItem) => {
        const group = typeof item.group === 'string' ? item.group : '';
        const groupLabel = typeof item.groupLabel === 'string' ? item.groupLabel : group;
        const duration = getNumber(item.duration);
        return {
          label,
          group,
          groupLabel: groupLabel || toTitleCase(group),
          duration,
        };
      })
    );
    
    return sortByMaxValue(
      allRows,
      (row) => row.groupLabel,
      (row) => row.duration || 0,
      validMetrics.length
    );
  }, [validMetrics]);

  const columns = useTableColumns<MainThreadWorkTableRow>(cols, columnHelper, showReportColumn);

  const table = useStandardTable({
    data,
    columns,
    grouping: ['groupLabel'],
  });

  if (!validMetrics.length) {
    return null;
  }

  return (
    <TableCard
      title="Main Thread Work Breakdown"
      table={table}
    />
  );
}

