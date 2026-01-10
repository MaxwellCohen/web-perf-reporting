"use client";
import { TableItem } from "@/lib/schema";
import { useMemo } from "react";
import {
  ColumnDef,
  createColumnHelper,
} from "@tanstack/react-table";
import { createPercentageAggregatedCell } from "../shared/aggregatedCellHelpers";
import { sortByMaxValue } from "../shared/dataSortingHelpers";
import { useStandardTable } from "../shared/tableConfigHelpers";
import { createURLColumn, createBytesColumn, createReportColumn } from "../shared/tableColumnHelpers";
import { TableCard } from "../shared/TableCard";

type UnusedJavaScriptData = {
  label: string;
  unusedJS: TableItem[];
};

type UnusedJSTableRow = {
  label: string;
  url: string;
  wastedBytes: number | undefined;
  totalBytes: number | undefined;
  wastedPercent: number | undefined;
};

type UnusedJavaScriptCardProps = {
  metrics: UnusedJavaScriptData[];
};

export function UnusedJavaScriptCard({ metrics }: UnusedJavaScriptCardProps) {
  "use no memo";
  const validMetrics = useMemo(() => metrics.filter(m => m.unusedJS.length > 0), [metrics]);
  const showReportColumn = validMetrics.length > 1;

  // Combine all unused JS data with labels
  const data = useMemo<UnusedJSTableRow[]>(() => {
    const allRows = validMetrics.flatMap(({ label, unusedJS }) =>
      unusedJS.map((item: TableItem) => {
        const url = typeof item.url === 'string' ? item.url : '';
        const wastedBytes = typeof item.wastedBytes === 'number' ? item.wastedBytes : undefined;
        const totalBytes = typeof item.totalBytes === 'number' ? item.totalBytes : undefined;
        const wastedPercent = typeof item.wastedPercent === 'number' ? item.wastedPercent : undefined;
        return {
          label,
          url: url.replace(/^https?:\/\//, '') || 'Unknown',
          wastedBytes,
          totalBytes,
          wastedPercent,
        };
      })
    );
    
    return sortByMaxValue(
      allRows,
      (row) => row.url,
      (row) => row.wastedBytes || 0,
      validMetrics.length
    );
  }, [validMetrics]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const columns = useMemo<ColumnDef<UnusedJSTableRow, any>[]>(() => {
    const columnHelper = createColumnHelper<UnusedJSTableRow>();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const cols: ColumnDef<UnusedJSTableRow, any>[] = [];
    
    cols.push(
      createURLColumn(columnHelper),
      createBytesColumn(columnHelper, 'wastedBytes', 'Wasted Bytes'),
      createBytesColumn(columnHelper, 'totalBytes', 'Total Bytes'),
      columnHelper.accessor('wastedPercent', {
        id: 'wastedPercent',
        header: 'Wasted %',
        enableSorting: true,
        enableResizing: true,
        filterFn: 'inNumberRange',
        aggregationFn: 'unique',
        cell: (info) => {
          const value = info.getValue();
          return value !== undefined ? `${value.toFixed(1)}%` : 'N/A';
        },
        aggregatedCell: createPercentageAggregatedCell('wastedPercent', 1),
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
    grouping: ['url'],
    enablePagination: true,
    defaultPageSize: 10,
  });

  if (!validMetrics.length) {
    return null;
  }

  return (
    <TableCard
      title="Unused JavaScript"
      table={table}
      showPagination
    />
  );
}

