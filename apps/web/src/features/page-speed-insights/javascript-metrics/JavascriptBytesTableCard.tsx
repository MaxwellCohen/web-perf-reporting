"use client";

import type { TableItem } from "@/lib/schema";
import * as PT from "@/features/page-speed-insights/shared/psiTableToolkit";

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

const columnHelper = PT.createColumnHelper<JavascriptBytesTableRow>();

function buildColumnDefs(includeWastedPercent: boolean): PT.ColumnDef<JavascriptBytesTableRow, unknown>[] {
  const cols: PT.ColumnDef<JavascriptBytesTableRow, unknown>[] = [
    PT.createURLColumn(columnHelper),
    PT.createBytesColumn(columnHelper, "wastedBytes", "Wasted Bytes"),
    PT.createBytesColumn(columnHelper, "totalBytes", "Total Bytes"),
  ];
  if (includeWastedPercent) {
    cols.push(PT.createPercentageColumn(columnHelper, "wastedPercent", "Wasted %", 1));
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
  "use no memo";
  const validMetrics = PT.useMemo(() => metrics.filter((m) => m.items.length > 0), [metrics]);
  const showReportColumn = validMetrics.length > 1;

  const data = PT.useMemo<JavascriptBytesTableRow[]>(() => {
    const allRows = validMetrics.flatMap(({ label, items }) =>
      items.map((item: TableItem) => {
        const url = PT.getUrlString(item.url);
        const wastedBytes = PT.getNumber(item.wastedBytes);
        const totalBytes = PT.getNumber(item.totalBytes);
        const row: JavascriptBytesTableRow = {
          label,
          url: url.replace(/^https?:\/\//, "") || "Unknown",
          wastedBytes,
          totalBytes,
        };
        if (includeWastedPercent) {
          row.wastedPercent = PT.getNumber(item.wastedPercent);
        }
        return row;
      }),
    );

    return PT.sortByMaxValue(
      allRows,
      (row) => row.url,
      (row) => row.wastedBytes || 0,
      validMetrics.length,
    );
  }, [validMetrics, includeWastedPercent]);

  const cols = PT.useMemo(() => buildColumnDefs(includeWastedPercent), [includeWastedPercent]);

  const columns = PT.useTableColumns<JavascriptBytesTableRow>(cols, columnHelper, showReportColumn);

  const table = PT.useStandardTable({
    data,
    columns,
    grouping: ["url"],
    enablePagination: true,
    defaultPageSize: 10,
  });

  if (!validMetrics.length) {
    return null;
  }

  return <PT.TableCard title={title} table={table} showPagination />;
}
