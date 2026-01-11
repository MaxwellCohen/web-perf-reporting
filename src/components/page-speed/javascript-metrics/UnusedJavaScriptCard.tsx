'use client';
import { TableItem } from '@/lib/schema';
import { getUrlString, getNumber } from '@/lib/utils';
import { useMemo } from 'react';
import { ColumnDef, createColumnHelper } from '@tanstack/react-table';
import { createPercentageAggregatedCell } from '@/components/page-speed/shared/aggregatedCellHelpers';
import { sortByMaxValue } from '@/components/page-speed/shared/dataSortingHelpers';
import { useStandardTable } from '@/components/page-speed/shared/tableConfigHelpers';
import {
  createURLColumn,
  createBytesColumn,
} from '@/components/page-speed/shared/tableColumnHelpers';
import { useTableColumns } from '@/components/page-speed/shared/useTableColumns';
import { TableCard } from '@/components/page-speed/shared/TableCard';

type UnusedJavaScriptData = {
  label: string;
  unusedJS: TableItem[];
};

type UnusedJSTableRow = {
  label: string;
  url: string;
  wastedBytes: number | undefined;
  totalBytes: number | undefined;
  wastedPercent: number | undefined;
};

type UnusedJavaScriptCardProps = {
  metrics: UnusedJavaScriptData[];
};

const columnHelper = createColumnHelper<UnusedJSTableRow>();

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const cols: ColumnDef<UnusedJSTableRow, any>[] = [
  createURLColumn(columnHelper),
  createBytesColumn(columnHelper, 'wastedBytes', 'Wasted Bytes'),
  createBytesColumn(columnHelper, 'totalBytes', 'Total Bytes'),
  columnHelper.accessor('wastedPercent', {
    id: 'wastedPercent',
    header: 'Wasted %',
    enableSorting: true,
    enableResizing: true,
    filterFn: 'inNumberRange',
    aggregationFn: 'unique',
    cell: (info) => {
      const value = info.getValue();
      return value !== undefined ? `${value.toFixed(1)}%` : 'N/A';
    },
    aggregatedCell: createPercentageAggregatedCell('wastedPercent', 1),
  }),
];

export function UnusedJavaScriptCard({ metrics }: UnusedJavaScriptCardProps) {
  'use no memo';
  const validMetrics = useMemo(
    () => metrics.filter((m) => m.unusedJS.length > 0),
    [metrics],
  );
  const showReportColumn = validMetrics.length > 1;

  // Combine all unused JS data with labels
  const data = useMemo<UnusedJSTableRow[]>(() => {
    const allRows = validMetrics.flatMap(({ label, unusedJS }) =>
      unusedJS.map((item: TableItem) => {
        const url = getUrlString(item.url);
        const wastedBytes = getNumber(item.wastedBytes);
        const totalBytes = getNumber(item.totalBytes);
        const wastedPercent = getNumber(item.wastedPercent);
        return {
          label,
          url: url.replace(/^https?:\/\//, '') || 'Unknown',
          wastedBytes,
          totalBytes,
          wastedPercent,
        };
      }),
    );

    return sortByMaxValue(
      allRows,
      (row) => row.url,
      (row) => row.wastedBytes || 0,
      validMetrics.length,
    );
  }, [validMetrics]);

  const columns = useTableColumns<UnusedJSTableRow>(cols, columnHelper, showReportColumn);

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

  return <TableCard title="Unused JavaScript" table={table} showPagination />;
}
