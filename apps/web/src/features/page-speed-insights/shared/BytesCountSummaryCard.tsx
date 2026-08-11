"use client";
import { useMemo } from "react";
import { createStockColumnHelper } from "@/features/page-speed-insights/tanstack-table-v9/createStockColumnHelper";
import {
  useStandardTable,
  type StandardColumnDef,
} from "@/features/page-speed-insights/tanstack-table-v9/useStandardTable";
import {
  createBytesColumn,
} from "@/features/page-speed-insights/shared/tableColumnHelpers";
import { useTableColumns } from "@/features/page-speed-insights/shared/useTableColumns";
import { TableCard } from "@/features/page-speed-insights/shared/TableCard";

export type BytesCountSummaryRow = {
  label: string;
  count: number;
  totalTransferSize: number;
  totalResourceSize: number;
};

type BytesCountSummaryCardProps = {
  title: string;
  countColumnTitle: string;
  rows: BytesCountSummaryRow[];
};

const columnHelper = createStockColumnHelper<BytesCountSummaryRow>();

export function BytesCountSummaryCard({ title, countColumnTitle, rows }: BytesCountSummaryCardProps) {
  const validStats = useMemo(() => rows.filter((s) => s.count > 0), [rows]);
  const showReportColumn = validStats.length > 1;

  const cols = useMemo<StandardColumnDef<BytesCountSummaryRow>[]>(
    () => [
      columnHelper.accessor("count", {
        id: "count",
        header: countColumnTitle,
        enableSorting: true,
        enableResizing: true,
        filterFn: "inNumberRange",
      }),
      createBytesColumn(columnHelper, "totalTransferSize", "Transfer Size"),
      createBytesColumn(columnHelper, "totalResourceSize", "Resource Size"),
    ],
    [countColumnTitle],
  );

  const columns = useTableColumns(cols, columnHelper, showReportColumn);
  const table = useStandardTable({ data: validStats, columns });

  if (!validStats.length) {
    return null;
  }

  return <TableCard title={title} table={table} className="" />;
}
