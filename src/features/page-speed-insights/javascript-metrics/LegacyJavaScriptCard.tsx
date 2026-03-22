"use client";
import { TableItem } from "@/lib/schema";
import { getUrlString, getNumber } from "@/lib/utils";
import { useMemo } from "react";
import {
  ColumnDef,
  createColumnHelper,
} from "@tanstack/react-table";
import { sortByMaxValue } from "@/features/page-speed-insights/shared/dataSortingHelpers";
import { useStandardTable } from "@/features/page-speed-insights/shared/tableConfigHelpers";
import { createURLColumn, createBytesColumn } from "@/features/page-speed-insights/shared/tableColumnHelpers";
import { useTableColumns } from "@/features/page-speed-insights/shared/useTableColumns";
import { TableCard } from "@/features/page-speed-insights/shared/TableCard";

type LegacyJavaScriptData = {
  label: string;
  legacyJS: TableItem[];
};

type LegacyJSTableRow = {
  label: string;
  url: string;
  wastedBytes: number | undefined;
  totalBytes: number | undefined;
};

type LegacyJavaScriptCardProps = {
  metrics: LegacyJavaScriptData[];
};

const columnHelper = createColumnHelper<LegacyJSTableRow>();
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const cols: ColumnDef<LegacyJSTableRow, any>[] = [
  createURLColumn(columnHelper),
  createBytesColumn(columnHelper, 'wastedBytes', 'Wasted Bytes'),
  createBytesColumn(columnHelper, 'totalBytes', 'Total Bytes'),
];

export function LegacyJavaScriptCard({ metrics }: LegacyJavaScriptCardProps) {
  "use no memo";
  const validMetrics = useMemo(() => metrics.filter(m => m.legacyJS.length > 0), [metrics]);
  const showReportColumn = validMetrics.length > 1;

  // Combine all legacy JS data with labels
  const data = useMemo<LegacyJSTableRow[]>(() => {
    const allRows = validMetrics.flatMap(({ label, legacyJS }) =>
      legacyJS.map((item: TableItem) => {
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

  const columns = useTableColumns<LegacyJSTableRow>(cols, columnHelper, showReportColumn);

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
      title="Legacy JavaScript"
      table={table}
      showPagination
    />
  );
}

