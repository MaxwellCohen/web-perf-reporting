"use client";
import { RenderMSValue } from "../lh-categories/table/RenderTableValue";
import { TableItem } from "@/lib/schema";
import { useMemo } from "react";
import {
  ColumnDef,
  createColumnHelper,
} from "@tanstack/react-table";
import { createNumericAggregatedCell } from "../shared/aggregatedCellHelpers";
import { sortByMaxValue } from "../shared/dataSortingHelpers";
import { useStandardTable } from "../shared/tableConfigHelpers";
import { createURLColumn, createReportColumn } from "../shared/tableColumnHelpers";
import { TableCard } from "../shared/TableCard";

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

export function BootupTimeCard({ metrics }: BootupTimeCardProps) {
  "use no memo";
  const validMetrics = useMemo(() => metrics.filter(m => m.bootupTime.length > 0), [metrics]);
  const showReportColumn = validMetrics.length > 1;

  // Combine all bootup time data with labels
  const data = useMemo<BootupTimeTableRow[]>(() => {
    const allRows = validMetrics.flatMap(({ label, bootupTime }) =>
      bootupTime.map((item: TableItem) => {
        const url = typeof item.url === 'string' ? item.url : '';
        const total = typeof item.total === 'number' ? item.total : undefined;
        const scripting = typeof item.scripting === 'number' ? item.scripting : undefined;
        const scriptParseCompile = typeof item.scriptParseCompile === 'number' ? item.scriptParseCompile : undefined;
        return {
          label,
          url: url.replace(/^https?:\/\//, '') || 'Unknown',
          total,
          scripting,
          scriptParseCompile,
        };
      })
    );
    
    return sortByMaxValue(
      allRows,
      (row) => row.url,
      (row) => row.total || 0,
      validMetrics.length
    );
  }, [validMetrics]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const columns = useMemo<ColumnDef<BootupTimeTableRow, any>[]>(() => {
    const columnHelper = createColumnHelper<BootupTimeTableRow>();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const cols: ColumnDef<BootupTimeTableRow, any>[] = [];
    
    cols.push(
      createURLColumn(columnHelper),
      columnHelper.accessor('total', {
        id: 'total',
        header: 'Total Time',
        enableSorting: true,
        enableResizing: true,
        filterFn: 'inNumberRange',
        aggregationFn: 'unique',
        cell: (info) => {
          const value = info.getValue();
          return value !== undefined ? <RenderMSValue value={value} /> : 'N/A';
        },
        aggregatedCell: createNumericAggregatedCell('total'),
      }),
      columnHelper.accessor('scripting', {
        id: 'scripting',
        header: 'Scripting',
        enableSorting: true,
        enableResizing: true,
        filterFn: 'inNumberRange',
        aggregationFn: 'unique',
        cell: (info) => {
          const value = info.getValue();
          return value !== undefined ? <RenderMSValue value={value} /> : 'N/A';
        },
        aggregatedCell: createNumericAggregatedCell('scripting'),
      }),
      columnHelper.accessor('scriptParseCompile', {
        id: 'scriptParseCompile',
        header: 'Parse & Compile',
        enableSorting: true,
        enableResizing: true,
        filterFn: 'inNumberRange',
        aggregationFn: 'unique',
        cell: (info) => {
          const value = info.getValue();
          return value !== undefined ? <RenderMSValue value={value} /> : 'N/A';
        },
        aggregatedCell: createNumericAggregatedCell('scriptParseCompile'),
      })
    );
    
    if (showReportColumn) {
      cols.push(createReportColumn(columnHelper));
    }
    
    return cols;
  }, [showReportColumn]);

  const table = useStandardTable({
    data,
    columns,
    grouping: ['url'],
    enablePagination: true,
    defaultPageSize: 10,
  });

  if (!validMetrics.length) {
    return null;
  }

  return (
    <TableCard
      title="JavaScript Bootup Time"
      table={table}
      showPagination
    />
  );
}

