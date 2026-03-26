"use client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table } from "@/components/ui/table";
import { TableItem } from "@/lib/schema";
import { getNumber } from "@/lib/utils";
import { useMemo } from "react";
import { ColumnDef, createColumnHelper } from "@tanstack/react-table";
import { DataTableHeader } from "@/features/page-speed-insights/lh-categories/table/DataTableHeader";
import { DataTableBody } from "@/features/page-speed-insights/lh-categories/table/DataTableBody";
import { sortByMaxValue } from "@/features/page-speed-insights/shared/dataSortingHelpers";
import { useStandardTable } from "@/features/page-speed-insights/shared/tableConfigHelpers";
import {
  createMSColumn,
  createTruncatedTextColumn,
} from "@/features/page-speed-insights/shared/tableColumnHelpers";
import { useTableColumns } from "@/features/page-speed-insights/shared/useTableColumns";
import { useNetworkMetricSeries } from "@/features/page-speed-insights/network-metrics/useNetworkMetricsStore";

type LatencyTableRow = {
  label: string;
  origin: string;
  latency: number | undefined;
};

const columnHelper = createColumnHelper<LatencyTableRow>();
const cols: ColumnDef<LatencyTableRow, unknown>[] = [
  createTruncatedTextColumn(columnHelper, {
    accessor: "origin",
    id: "origin",
    header: "Origin",
    maxWidthClass: "max-w-50",
    enableGrouping: true,
  }),
  createMSColumn(columnHelper, "latency", "Latency"),
];

export function ServerLatencyCard() {
  "use no memo";
  const series = useNetworkMetricSeries();
  const validMetrics = useMemo(() => series.filter((m) => m.serverLatency.length > 0), [series]);

  const showReportColumn = validMetrics.length > 1;

  // Combine all server latency data with labels
  const data = useMemo((): LatencyTableRow[] => {
    const allRows = validMetrics.flatMap(({ label, serverLatency }) =>
      serverLatency.map((item: TableItem) => {
        const origin = typeof item.origin === "string" ? item.origin : "";
        const latency = getNumber(item.serverResponseTime);
        return {
          label,
          origin: origin.replace(/^https?:\/\//, "") || "Unknown",
          latency,
        };
      }),
    );

    return sortByMaxValue(
      allRows,
      (row) => row.origin,
      (row) => row.latency || 0,
      validMetrics.length,
    );
  }, [validMetrics]);

  const columns = useTableColumns<LatencyTableRow>(cols, columnHelper, showReportColumn);

  const table = useStandardTable({
    data,
    columns,
    grouping: ["origin"],
  });

  if (!validMetrics.length) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Server Backend Latencies</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="w-full max-h-96 overflow-y-auto">
          <Table className="w-full" style={{ width: "100%" }}>
            <DataTableHeader table={table} />
            <DataTableBody table={table} />
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
