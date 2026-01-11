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

type NetworkRTTData = {
  label: string;
  networkRTT: TableItem[];
};

type RTTTableRow = {
  label: string;
  origin: string;
  rtt: number | undefined;
};

type NetworkRTTCardProps = {
  metrics: NetworkRTTData[];
};

const columnHelper = createColumnHelper<RTTTableRow>();
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const cols: ColumnDef<RTTTableRow, any>[] = [
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
  columnHelper.accessor('rtt', {
    id: 'rtt',
    header: 'RTT',
    enableSorting: true,
    enableResizing: true,
    filterFn: 'inNumberRange',
    cell: (info) => {
      const value = info.getValue();
      return value !== undefined ? <RenderMSValue value={value} /> : 'N/A';
    },
    aggregatedCell: createNumericAggregatedCell('rtt'),
  }),
];

export function NetworkRTTCard({ metrics }: NetworkRTTCardProps) {
  "use no memo";
  const validMetrics = useMemo(() => metrics.filter(m => m.networkRTT.length > 0), [metrics]);


  const showReportColumn = validMetrics.length > 1;

  // Combine all RTT data with labels
  const data = useMemo<RTTTableRow[]>(() => {
    const allRows = validMetrics.flatMap(({ label, networkRTT }) =>
      networkRTT.map((item: TableItem) => {
        const origin = typeof item.origin === 'string' ? item.origin : '';
        const rtt = getNumber(item.rtt);
        return {
          label,
          origin: origin.replace(/^https?:\/\//, '') || 'Unknown',
          rtt,
        };
      })
    );
    
    return sortByMaxValue(
      allRows,
      (row) => row.origin,
      (row) => row.rtt || 0,
      validMetrics.length
    );
  }, [validMetrics]);

  const columns = useTableColumns<RTTTableRow>(cols, columnHelper, showReportColumn);

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
        <CardTitle>Network Round Trip Times (RTT)</CardTitle>
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

