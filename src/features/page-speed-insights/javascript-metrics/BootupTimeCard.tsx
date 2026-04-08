/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import type { TableItem } from "@/lib/schema";
import * as PT from "@/features/page-speed-insights/shared/psiTableToolkit";

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

const columnHelper = PT.createColumnHelper<BootupTimeTableRow>();

const cols: PT.ColumnDef<BootupTimeTableRow, unknown>[] = [
  PT.createURLColumn(columnHelper),
  PT.createMSColumn(columnHelper, "scriptParseCompile", "Parse & Compile"),
  PT.createMSColumn(columnHelper, "scripting", "Scripting"),
  PT.createMSColumn(columnHelper, "total", "Total Time"),
];

function itemToRow(label: string, item: TableItem): BootupTimeTableRow {
  return {
    label,
    url: PT.getUrlString(item.url),
    total: PT.getNumber(item.total),
    scripting: PT.getNumber(item.scripting),
    scriptParseCompile: PT.getNumber(item.scriptParseCompile),
  };
}

export function BootupTimeCard({ metrics }: BootupTimeCardProps) {
  const validMetrics = PT.useMemo(() => metrics.filter((m) => m.bootupTime.length > 0), [metrics]);
  const showReportColumn = validMetrics.length > 1;

  const data = PT.useMemo<BootupTimeTableRow[]>(() => {
    if (!validMetrics.length) return [];
    const allRows = validMetrics.flatMap(({ label, bootupTime }) =>
      bootupTime.map((item) => itemToRow(label, item)),
    );
    return PT.sortByMaxValue(
      allRows,
      (row) => row.url,
      (row) => row.total || 0,
      validMetrics.length,
    );
  }, [validMetrics]);

  const columns = PT.useTableColumns<BootupTimeTableRow>(cols, columnHelper, showReportColumn);

  if (!validMetrics.length) return null;

  return <BootupTimeTable data={data} columns={columns} />;
}

function BootupTimeTable({
  data,
  columns,
}: {
  data: BootupTimeTableRow[];
  columns: PT.ColumnDef<BootupTimeTableRow, any>[];
}) {
  "use no memo";
  const table = PT.useStandardTable({
    data,
    columns,
    grouping: ["url"],
    enablePagination: true,
    defaultPageSize: 10,
  });

  return <PT.TableCard title="JavaScript Bootup Time" table={table} showPagination />;
}
