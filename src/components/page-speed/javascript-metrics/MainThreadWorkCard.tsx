"use client";
import { RenderMSValue } from "@/components/page-speed/lh-categories/table/RenderTableValue";
import { TableItem } from "@/lib/schema";
import { getNumber } from "@/lib/utils";
import { useMemo } from "react";
import {
  ColumnDef,
  createColumnHelper,
} from "@tanstack/react-table";
import { toTitleCase } from "@/components/page-speed/toTitleCase";
import { createNumericAggregatedCell, createStringAggregatedCell } from "@/components/page-speed/shared/aggregatedCellHelpers";
import { sortByMaxValue } from "@/components/page-speed/shared/dataSortingHelpers";
import { useStandardTable } from "@/components/page-speed/shared/tableConfigHelpers";
import { useTableColumns } from "@/components/page-speed/shared/useTableColumns";
import { TableCard } from "@/components/page-speed/shared/TableCard";

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
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const cols: ColumnDef<MainThreadWorkTableRow, any>[] = [
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
  columnHelper.accessor('duration', {
    id: 'duration',
    header: 'Time Spent',
    enableSorting: true,
    enableResizing: true,
    filterFn: 'inNumberRange',
    aggregationFn: 'unique',
    cell: (info) => {
      const value = info.getValue();
      return value !== undefined ? <RenderMSValue value={value} /> : 'N/A';
    },
    aggregatedCell: createNumericAggregatedCell('duration'),
  })
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

