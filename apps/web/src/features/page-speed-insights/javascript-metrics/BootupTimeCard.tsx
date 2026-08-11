/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import type { TableItem } from "@/lib/schema";
import { getNumber, getUrlString } from "@/lib/utils";
import { sortByMaxValue } from "@/features/page-speed-insights/shared/dataSortingHelpers";
import type { StockColumnDef } from "@/features/page-speed-insights/shared/tanstackStockTypes";
import { TableCard } from "@/features/page-speed-insights/shared/TableCard";
import {
  createMSColumn,
  createURLColumn,
} from "@/features/page-speed-insights/shared/tableColumnHelpers";
import { useTableColumns } from "@/features/page-speed-insights/shared/useTableColumns";
import { createStockColumnHelper } from "@/features/page-speed-insights/tanstack-table-v9/createStockColumnHelper";
import { useStandardTable } from "@/features/page-speed-insights/tanstack-table-v9/useStandardTable";

type BootupTimeData = {
  label: string;
  bootupTime: TableItem[];
};

type BootupTimeTableRow = {
  label: string;
  url: string;
  total: number | undefined;
  scripting: number | undefined;
  scriptParseCompile: number | undefined;
};

type BootupTimeCardProps = {
  metrics: BootupTimeData[];
};

const columnHelper = createStockColumnHelper<BootupTimeTableRow>();

const cols: StockColumnDef<BootupTimeTableRow, unknown>[] = [
  createURLColumn(columnHelper),
  createMSColumn(columnHelper, "scriptParseCompile", "Parse & Compile"),
  createMSColumn(columnHelper, "scripting", "Scripting"),
  createMSColumn(columnHelper, "total", "Total Time"),
];

function itemToRow(label: string, item: TableItem): BootupTimeTableRow {
  return {
    label,
    url: getUrlString(item.url),
    total: getNumber(item.total),
    scripting: getNumber(item.scripting),
    scriptParseCompile: getNumber(item.scriptParseCompile),
  };
}

export function BootupTimeCard({ metrics }: BootupTimeCardProps) {
  const validMetrics = metrics.filter((m) => m.bootupTime.length > 0);
  const showReportColumn = validMetrics.length > 1;

  const allRows = validMetrics.flatMap(({ label, bootupTime }) =>
    bootupTime.map((item) => itemToRow(label, item)),
  );
  const data = sortByMaxValue(
    allRows,
    (row) => row.url,
    (row) => row.total || 0,
    validMetrics.length,
  );

  const columns = useTableColumns<BootupTimeTableRow>(cols, columnHelper, showReportColumn);

  if (!validMetrics.length) return null;

  return <BootupTimeTable data={data} columns={columns} />;
}

function BootupTimeTable({
  data,
  columns,
}: {
  data: BootupTimeTableRow[];
  columns: StockColumnDef<BootupTimeTableRow, any>[];
}) {
  const table = useStandardTable({
    data,
    columns,
    grouping: ["url"],
    enablePagination: true,
    defaultPageSize: 10,
  });

  return <TableCard title="JavaScript Bootup Time" table={table} showPagination />;
}
