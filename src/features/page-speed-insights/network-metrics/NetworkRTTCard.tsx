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

type RTTTableRow = {
  label: string;
  origin: string;
  rtt: number | undefined;
};

const columnHelper = createColumnHelper<RTTTableRow>();
const cols: ColumnDef<RTTTableRow, unknown>[] = [
  createTruncatedTextColumn(columnHelper, {
    accessor: "origin",
    id: "origin",
    header: "Origin",
    maxWidthClass: "max-w-50",
    enableGrouping: true,
  }),
  createMSColumn(columnHelper, "rtt", "RTT"),
];

export function NetworkRTTCard() {
  "use no memo";
  const series = useNetworkMetricSeries();
  const validMetrics = useMemo(() => series.filter((m) => m.networkRTT.length > 0), [series]);

  const showReportColumn = validMetrics.length > 1;

  // Combine all RTT data with labels
  const data = useMemo<RTTTableRow[]>(() => {
    const allRows = validMetrics.flatMap(({ label, networkRTT }) =>
      networkRTT.map((item: TableItem) => {
        const origin = typeof item.origin === "string" ? item.origin : "";
        const rtt = getNumber(item.rtt);
        return {
          label,
          origin: origin.replace(/^https?:\/\//, "") || "Unknown",
          rtt,
        };
      }),
    );

    return sortByMaxValue(
      allRows,
      (row) => row.origin,
      (row) => row.rtt || 0,
      validMetrics.length,
    );
  }, [validMetrics]);

  const columns = useTableColumns<RTTTableRow>(cols, columnHelper, showReportColumn);

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
        <CardTitle>Network Round Trip Times (RTT)</CardTitle>
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
