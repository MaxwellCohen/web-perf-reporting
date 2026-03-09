/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';
import { RenderMSValue } from '@/components/page-speed/lh-categories/table/RenderTableValue';
import { TableItem } from '@/lib/schema';
import { getUrlString, getNumber } from '@/lib/utils';
import { useMemo } from 'react';
import { ColumnDef, createColumnHelper } from '@tanstack/react-table';
import { createNumericAggregatedCell } from '@/components/page-speed/shared/aggregatedCellHelpers';
import { sortByMaxValue } from '@/components/page-speed/shared/dataSortingHelpers';
import { useStandardTable } from '@/components/page-speed/shared/tableConfigHelpers';
import { createURLColumn } from '@/components/page-speed/shared/tableColumnHelpers';
import { useTableColumns } from '@/components/page-speed/shared/useTableColumns';
import { TableCard } from '@/components/page-speed/shared/TableCard';

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

const columnHelper = createColumnHelper<BootupTimeTableRow>();

function msCell(info: { getValue: () => number | undefined }) {
  const value = info.getValue();
  return value !== undefined ? <RenderMSValue value={value} /> : 'N/A';
}

const msColumnConfig = {
  enableSorting: true,
  enableResizing: true,
  filterFn: 'inNumberRange' as const,
  aggregationFn: 'unique' as const,
  cell: msCell,
};

const cols: ColumnDef<BootupTimeTableRow, any>[] = [
  createURLColumn(columnHelper),
  columnHelper.accessor('scriptParseCompile', {
    id: 'scriptParseCompile',
    header: 'Parse & Compile',
    ...msColumnConfig,
    aggregatedCell: createNumericAggregatedCell('scriptParseCompile'),
  }),
  columnHelper.accessor('scripting', {
    id: 'scripting',
    header: 'Scripting',
    ...msColumnConfig,
    aggregatedCell: createNumericAggregatedCell('scripting'),
  }),
  columnHelper.accessor('total', {
    id: 'total',
    header: 'Total Time',
    ...msColumnConfig,
    aggregatedCell: createNumericAggregatedCell('total'),
  }),
];

function itemToRow(label: string, item: TableItem): BootupTimeTableRow {
  return {
    label,
    url: getUrlString(item.url),
    total: getNumber(item.total),
    scripting: getNumber(item.scripting),
    scriptParseCompile: getNumber(item.scriptParseCompile),
  };
}

export function BootupTimeCard({ metrics }: BootupTimeCardProps) {
  const validMetrics = useMemo(
    () => metrics.filter((m) => m.bootupTime.length > 0),
    [metrics],
  );
  const showReportColumn = validMetrics.length > 1;

  const data = useMemo<BootupTimeTableRow[]>(() => {
    if (!validMetrics.length) return [];
    const allRows = validMetrics.flatMap(({ label, bootupTime }) =>
      bootupTime.map((item) => itemToRow(label, item)),
    );
    return sortByMaxValue(
      allRows,
      (row) => row.url,
      (row) => row.total || 0,
      validMetrics.length,
    );
  }, [validMetrics]);

  const columns = useTableColumns<BootupTimeTableRow>(
    cols,
    columnHelper,
    showReportColumn,
  );

  if (!validMetrics.length) return null;

  return <BootupTimeTable data={data} columns={columns} />;
}

function BootupTimeTable({
  data,
  columns,
}: {
  data: BootupTimeTableRow[];
  columns: ColumnDef<BootupTimeTableRow, any>[];
}) {
  'use no memo';
  const table = useStandardTable({
    data,
    columns,
    grouping: ['url'],
    enablePagination: true,
    defaultPageSize: 10,
  });

  return (
    <TableCard
      title="JavaScript Bootup Time"
      table={table}
      showPagination
    />
  );
}
