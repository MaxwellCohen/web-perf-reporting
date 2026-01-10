"use client";
import { RenderMSValue } from "../lh-categories/table/RenderTableValue";
import { TableItem } from "@/lib/schema";
import { useMemo } from "react";
import {
  ColumnDef,
  createColumnHelper,
} from "@tanstack/react-table";
import { toTitleCase } from "../toTitleCase";
import { createNumericAggregatedCell, createStringAggregatedCell } from "../shared/aggregatedCellHelpers";
import { sortByMaxValue } from "../shared/dataSortingHelpers";
import { useStandardTable } from "../shared/tableConfigHelpers";
import { createReportColumn } from "../shared/tableColumnHelpers";
import { TableCard } from "../shared/TableCard";

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
        const duration = typeof item.duration === 'number' ? item.duration : undefined;
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

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const columns = useMemo<ColumnDef<MainThreadWorkTableRow, any>[]>(() => {
    const columnHelper = createColumnHelper<MainThreadWorkTableRow>();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const cols: ColumnDef<MainThreadWorkTableRow, any>[] = [];
    
    cols.push(
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
    );
    
    if (showReportColumn) {
      cols.push(createReportColumn(columnHelper));
    }
    
    return cols;
  }, [showReportColumn]);

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

