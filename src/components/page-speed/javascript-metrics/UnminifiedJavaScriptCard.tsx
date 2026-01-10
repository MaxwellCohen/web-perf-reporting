"use client";
import { TableItem } from "@/lib/schema";
import { useMemo } from "react";
import {
  ColumnDef,
  createColumnHelper,
} from "@tanstack/react-table";
import { sortByMaxValue } from "@/components/page-speed/shared/dataSortingHelpers";
import { useStandardTable } from "@/components/page-speed/shared/tableConfigHelpers";
import { createURLColumn, createBytesColumn, createReportColumn } from "@/components/page-speed/shared/tableColumnHelpers";
import { TableCard } from "@/components/page-speed/shared/TableCard";

type UnminifiedJavaScriptData = {
  label: string;
  unminifiedJS: TableItem[];
};

type UnminifiedJSTableRow = {
  label: string;
  url: string;
  wastedBytes: number | undefined;
  totalBytes: number | undefined;
};

type UnminifiedJavaScriptCardProps = {
  metrics: UnminifiedJavaScriptData[];
};

export function UnminifiedJavaScriptCard({ metrics }: UnminifiedJavaScriptCardProps) {
  "use no memo";
  const validMetrics = useMemo(() => metrics.filter(m => m.unminifiedJS.length > 0), [metrics]);
  const showReportColumn = validMetrics.length > 1;

  // Combine all unminified JS data with labels
  const data = useMemo<UnminifiedJSTableRow[]>(() => {
    const allRows = validMetrics.flatMap(({ label, unminifiedJS }) =>
      unminifiedJS.map((item: TableItem) => {
        const url = typeof item.url === 'string' ? item.url : '';
        const wastedBytes = typeof item.wastedBytes === 'number' ? item.wastedBytes : undefined;
        const totalBytes = typeof item.totalBytes === 'number' ? item.totalBytes : undefined;
        return {
          label,
          url: url.replace(/^https?:\/\//, '') || 'Unknown',
          wastedBytes,
          totalBytes,
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
  const columns = useMemo<ColumnDef<UnminifiedJSTableRow, any>[]>(() => {
    const columnHelper = createColumnHelper<UnminifiedJSTableRow>();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const cols: ColumnDef<UnminifiedJSTableRow, any>[] = [];
    
    cols.push(
      createURLColumn(columnHelper),
      createBytesColumn(columnHelper, 'wastedBytes', 'Wasted Bytes'),
      createBytesColumn(columnHelper, 'totalBytes', 'Total Bytes'),
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
      title="Unminified JavaScript"
      table={table}
      showPagination
    />
  );
}

