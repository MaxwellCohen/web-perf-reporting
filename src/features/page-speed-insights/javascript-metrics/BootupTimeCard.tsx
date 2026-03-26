/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import { TableItem } from "@/lib/schema";
import { getUrlString, getNumber } from "@/lib/utils";
import { useMemo } from "react";
import { ColumnDef, createColumnHelper } from "@tanstack/react-table";
import { sortByMaxValue } from "@/features/page-speed-insights/shared/dataSortingHelpers";
import { useStandardTable } from "@/features/page-speed-insights/shared/tableConfigHelpers";
import {
  createMSColumn,
  createURLColumn,
} from "@/features/page-speed-insights/shared/tableColumnHelpers";
import { useTableColumns } from "@/features/page-speed-insights/shared/useTableColumns";
import { TableCard } from "@/features/page-speed-insights/shared/TableCard";

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

const columnHelper = createColumnHelper<BootupTimeTableRow>();

const cols: ColumnDef<BootupTimeTableRow, unknown>[] = [
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
  const validMetrics = useMemo(() => metrics.filter((m) => m.bootupTime.length > 0), [metrics]);
  const showReportColumn = validMetrics.length > 1;

  const data = useMemo<BootupTimeTableRow[]>(() => {
    if (!validMetrics.length) return [];
    const allRows = validMetrics.flatMap(({ label, bootupTime }) =>
      bootupTime.map((item) => itemToRow(label, item)),
    );
    return sortByMaxValue(
      allRows,
      (row) => row.url,
      (row) => row.total || 0,
      validMetrics.length,
    );
  }, [validMetrics]);

  const columns = useTableColumns<BootupTimeTableRow>(cols, columnHelper, showReportColumn);

  if (!validMetrics.length) return null;

  return <BootupTimeTable data={data} columns={columns} />;
}

function BootupTimeTable({
  data,
  columns,
}: {
  data: BootupTimeTableRow[];
  columns: ColumnDef<BootupTimeTableRow, any>[];
}) {
  "use no memo";
  const table = useStandardTable({
    data,
    columns,
    grouping: ["url"],
    enablePagination: true,
    defaultPageSize: 10,
  });

  return <TableCard title="JavaScript Bootup Time" table={table} showPagination />;
}
