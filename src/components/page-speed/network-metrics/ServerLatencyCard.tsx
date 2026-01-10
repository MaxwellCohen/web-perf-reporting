"use client";
import { Card, CardContent, CardHeader, CardTitle } from "../../ui/card";
import { Table } from "@/components/ui/table";
import { RenderMSValue } from "../lh-categories/table/RenderTableValue";
import { TableItem } from "@/lib/schema";
import { useMemo } from "react";
import {
  ColumnDef,
  createColumnHelper,
} from "@tanstack/react-table";
import { DataTableHeader } from "../lh-categories/table/DataTableHeader";
import { DataTableBody } from "../lh-categories/table/DataTableBody";
import { createNumericAggregatedCell, createReportLabelAggregatedCell } from "../shared/aggregatedCellHelpers";
import { sortByMaxValue } from "../shared/dataSortingHelpers";
import { useStandardTable } from "../shared/tableConfigHelpers";

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

export function ServerLatencyCard({ metrics }: ServerLatencyCardProps) {
  "use no memo";
  const validMetrics = useMemo(() => metrics.filter(m => m.serverLatency.length > 0), [metrics]);


  const showReportColumn = validMetrics.length > 1;

  // Combine all server latency data with labels
  const data = useMemo<LatencyTableRow[]>(() => {
    const allRows = validMetrics.flatMap(({ label, serverLatency }) =>
      serverLatency.map((item: TableItem) => {
        const origin = typeof item.origin === 'string' ? item.origin : '';
        const latency = typeof item.serverResponseTime === 'number' ? item.serverResponseTime : undefined;
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

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const columns = useMemo<ColumnDef<LatencyTableRow, any>[]>(() => {
    const columnHelper = createColumnHelper<LatencyTableRow>();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const cols: ColumnDef<LatencyTableRow, any>[] = [];
    
    cols.push(
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
      })
    );
    
    if (showReportColumn) {
      cols.push(
        columnHelper.accessor('label', {
          id: 'label',
          header: 'Report',
          enableSorting: true,
          enableResizing: true,
          filterFn: 'includesString',
          aggregatedCell: createReportLabelAggregatedCell('label'),
        })
      );
    }
    
    return cols;
  }, [showReportColumn]);

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

