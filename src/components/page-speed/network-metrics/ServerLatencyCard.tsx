"use client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table } from "@/components/ui/table";
import { RenderMSValue } from "@/components/page-speed/lh-categories/table/RenderTableValue";
import { TableItem } from "@/lib/schema";
import { getNumber } from "@/lib/utils";
import { useMemo } from "react";
import {
  ColumnDef,
  createColumnHelper,
} from "@tanstack/react-table";
import { DataTableHeader } from "@/components/page-speed/lh-categories/table/DataTableHeader";
import { DataTableBody } from "@/components/page-speed/lh-categories/table/DataTableBody";
import { createNumericAggregatedCell } from "@/components/page-speed/shared/aggregatedCellHelpers";
import { sortByMaxValue } from "@/components/page-speed/shared/dataSortingHelpers";
import { useStandardTable } from "@/components/page-speed/shared/tableConfigHelpers";
import { useTableColumns } from "@/components/page-speed/shared/useTableColumns";

type ServerLatencyData = {
  label: string;
  serverLatency: TableItem[];
};

type LatencyTableRow = {
  label: string;
  origin: string;
  latency: number | undefined;
};

type ServerLatencyCardProps = {
  metrics: ServerLatencyData[];
};

const columnHelper = createColumnHelper<LatencyTableRow>();
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const cols: ColumnDef<LatencyTableRow, any>[] = [
  columnHelper.accessor('origin', {
    id: 'origin',
    header: 'Origin',
    enableSorting: true,
    enableGrouping: true,
    enableResizing: true,
    filterFn: 'includesString',
    cell: (info) => (
      <div className="truncate max-w-50" title={info.getValue()}>
        {info.getValue()}
      </div>
    ),
  }),
  columnHelper.accessor('latency', {
    id: 'latency',
    header: 'Latency',
    enableSorting: true,
    enableResizing: true,
    filterFn: 'inNumberRange',
    cell: (info) => {
      const value = info.getValue();
      return value !== undefined ? <RenderMSValue value={value} /> : 'N/A';
    },
    aggregatedCell: createNumericAggregatedCell('latency'),
  }),
];

export function ServerLatencyCard({ metrics }: ServerLatencyCardProps) {
  "use no memo";
  const validMetrics = useMemo(() => metrics.filter(m => m.serverLatency.length > 0), [metrics]);


  const showReportColumn = validMetrics.length > 1;

  // Combine all server latency data with labels
  const data = useMemo<LatencyTableRow[]>(() => {
    const allRows = validMetrics.flatMap(({ label, serverLatency }) =>
      serverLatency.map((item: TableItem) => {
        const origin = typeof item.origin === 'string' ? item.origin : '';
        const latency = getNumber(item.serverResponseTime);
        return {
          label,
          origin: origin.replace(/^https?:\/\//, '') || 'Unknown',
          latency,
        };
      })
    );
    
    return sortByMaxValue(
      allRows,
      (row) => row.origin,
      (row) => row.latency || 0,
      validMetrics.length
    );
  }, [validMetrics]);

  const columns = useTableColumns<LatencyTableRow>(cols, columnHelper, showReportColumn);

  const table = useStandardTable({
    data,
    columns,
    grouping: ['origin'],
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
          <Table className="w-full" style={{ width: '100%' }}>
            <DataTableHeader table={table} />
            <DataTableBody table={table} />
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}

