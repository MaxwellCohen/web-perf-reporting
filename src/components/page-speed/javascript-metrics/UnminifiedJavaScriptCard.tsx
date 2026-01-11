"use client";
import { TableItem } from "@/lib/schema";
import { getUrlString, getNumber } from "@/lib/utils";
import { useMemo } from "react";
import {
  ColumnDef,
  createColumnHelper,
} from "@tanstack/react-table";
import { sortByMaxValue } from "@/components/page-speed/shared/dataSortingHelpers";
import { useStandardTable } from "@/components/page-speed/shared/tableConfigHelpers";
import { createURLColumn, createBytesColumn } from "@/components/page-speed/shared/tableColumnHelpers";
import { useTableColumns } from "@/components/page-speed/shared/useTableColumns";
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

const columnHelper = createColumnHelper<UnminifiedJSTableRow>();
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const cols: ColumnDef<UnminifiedJSTableRow, any>[] = [
  createURLColumn(columnHelper),
  createBytesColumn(columnHelper, 'wastedBytes', 'Wasted Bytes'),
  createBytesColumn(columnHelper, 'totalBytes', 'Total Bytes'),
];

export function UnminifiedJavaScriptCard({ metrics }: UnminifiedJavaScriptCardProps) {
  "use no memo";
  const validMetrics = useMemo(() => metrics.filter(m => m.unminifiedJS.length > 0), [metrics]);
  const showReportColumn = validMetrics.length > 1;

  // Combine all unminified JS data with labels
  const data = useMemo<UnminifiedJSTableRow[]>(() => {
    const allRows = validMetrics.flatMap(({ label, unminifiedJS }) =>
      unminifiedJS.map((item: TableItem) => {
        const url = getUrlString(item.url);
        const wastedBytes = getNumber(item.wastedBytes);
        const totalBytes = getNumber(item.totalBytes);
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

  const columns = useTableColumns<UnminifiedJSTableRow>(cols, columnHelper, showReportColumn);

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

