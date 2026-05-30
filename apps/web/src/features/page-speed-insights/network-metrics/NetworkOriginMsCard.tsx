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
import type { NetworkMetricSeries } from "@/features/page-speed-insights/network-metrics/useNetworkMetricsData";

type OriginMsRow = {
  label: string;
  origin: string;
  ms: number | undefined;
};

const columnHelper = createColumnHelper<OriginMsRow>();

function buildColumns(valueColumnHeader: string): ColumnDef<OriginMsRow, unknown>[] {
  return [
    createTruncatedTextColumn(columnHelper, {
      accessor: "origin",
      id: "origin",
      header: "Origin",
      maxWidthClass: "max-w-50",
      enableGrouping: true,
    }),
    createMSColumn(columnHelper, "ms", valueColumnHeader),
  ];
}

type NetworkOriginMsCardProps = {
  title: string;
  valueColumnHeader: string;
  series: NetworkMetricSeries[];
  itemsField: "networkRTT" | "serverLatency";
  /** Lighthouse item field to read milliseconds from */
  msItemField: "rtt" | "serverResponseTime";
};

export function NetworkOriginMsCard({
  title,
  valueColumnHeader,
  series,
  itemsField,
  msItemField,
}: NetworkOriginMsCardProps) {
  "use no memo";
  const validMetrics = useMemo(() => series.filter((m) => m[itemsField].length > 0), [series, itemsField]);

  const showReportColumn = validMetrics.length > 1;

  const data = useMemo<OriginMsRow[]>(() => {
    const allRows = validMetrics.flatMap((m) =>
      m[itemsField].map((item: TableItem) => {
        const origin = typeof item.origin === "string" ? item.origin : "";
        const ms =
          msItemField === "rtt" ? getNumber(item.rtt) : getNumber(item.serverResponseTime);
        return {
          label: m.label,
          origin: origin.replace(/^https?:\/\//, "") || "Unknown",
          ms,
        };
      }),
    );

    return sortByMaxValue(
      allRows,
      (row) => row.origin,
      (row) => row.ms || 0,
      validMetrics.length,
    );
  }, [validMetrics, itemsField, msItemField]);

  const cols = useMemo(() => buildColumns(valueColumnHeader), [valueColumnHeader]);

  const columns = useTableColumns<OriginMsRow>(cols, columnHelper, showReportColumn);

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
        <CardTitle>{title}</CardTitle>
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
