"use client";

import { useMemo } from "react";
import type { TableItem } from "@/lib/schema";
import { getNumber, getUrlString } from "@/lib/utils";
import { sortByMaxValue } from "@/features/page-speed-insights/shared/dataSortingHelpers";
import type { StockColumnDef } from "@/features/page-speed-insights/shared/tanstackStockTypes";
import { TableCard } from "@/features/page-speed-insights/shared/TableCard";
import {
  createBytesColumn,
  createPercentageColumn,
  createURLColumn,
} from "@/features/page-speed-insights/shared/tableColumnHelpers";
import { useTableColumns } from "@/features/page-speed-insights/shared/useTableColumns";
import { createStockColumnHelper } from "@/features/page-speed-insights/tanstack-table-v9/createStockColumnHelper";
import { useStandardTable } from "@/features/page-speed-insights/tanstack-table-v9/useStandardTable";

export type JavascriptBytesMetric = {
  label: string;
  items: TableItem[];
};

type JavascriptBytesTableRow = {
  label: string;
  url: string;
  wastedBytes: number | undefined;
  totalBytes: number | undefined;
  wastedPercent?: number | undefined;
};

const columnHelper = createStockColumnHelper<JavascriptBytesTableRow>();

function buildColumnDefs(includeWastedPercent: boolean): StockColumnDef<JavascriptBytesTableRow, unknown>[] {
  const cols: StockColumnDef<JavascriptBytesTableRow, unknown>[] = [
    createURLColumn(columnHelper),
    createBytesColumn(columnHelper, "wastedBytes", "Wasted Bytes"),
    createBytesColumn(columnHelper, "totalBytes", "Total Bytes"),
  ];
  if (includeWastedPercent) {
    cols.push(createPercentageColumn(columnHelper, "wastedPercent", "Wasted %", 1));
  }
  return cols;
}

type JavascriptBytesTableCardProps = {
  title: string;
  metrics: JavascriptBytesMetric[];
  /** Adds a "Wasted %" column (e.g. unused JavaScript audit). */
  includeWastedPercent?: boolean;
};

export function JavascriptBytesTableCard({
  title,
  metrics,
  includeWastedPercent = false,
}: JavascriptBytesTableCardProps) {
  const validMetrics = useMemo(() => metrics.filter((m) => m.items.length > 0), [metrics]);
  const showReportColumn = validMetrics.length > 1;

  const data = useMemo<JavascriptBytesTableRow[]>(() => {
    const allRows = validMetrics.flatMap(({ label, items }) =>
      items.map((item: TableItem) => {
        const url = getUrlString(item.url);
        const wastedBytes = getNumber(item.wastedBytes);
        const totalBytes = getNumber(item.totalBytes);
        const row: JavascriptBytesTableRow = {
          label,
          url: url.replace(/^https?:\/\//, "") || "Unknown",
          wastedBytes,
          totalBytes,
        };
        if (includeWastedPercent) {
          row.wastedPercent = getNumber(item.wastedPercent);
        }
        return row;
      }),
    );

    return sortByMaxValue(
      allRows,
      (row) => row.url,
      (row) => row.wastedBytes || 0,
      validMetrics.length,
    );
  }, [validMetrics, includeWastedPercent]);

  const cols = useMemo(() => buildColumnDefs(includeWastedPercent), [includeWastedPercent]);

  const columns = useTableColumns<JavascriptBytesTableRow>(cols, columnHelper, showReportColumn);

  const table = useStandardTable({
    data,
    columns,
    grouping: ["url"],
    enablePagination: true,
    defaultPageSize: 10,
  });

  if (!validMetrics.length) {
    return null;
  }

  return <TableCard title={title} table={table} showPagination />;
}
