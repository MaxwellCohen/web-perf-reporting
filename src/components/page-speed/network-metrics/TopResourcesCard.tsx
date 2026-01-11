"use client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table } from "@/components/ui/table";
import { RenderBytesValue, RenderMSValue } from "@/components/page-speed/lh-categories/table/RenderTableValue";
import { toTitleCase } from "@/components/page-speed/toTitleCase";
import { TableItem } from "@/lib/schema";
import { getUrlString, getNumber } from "@/lib/utils";
import { useMemo } from "react";
import {
  ColumnDef,
  createColumnHelper,
} from "@tanstack/react-table";
import { DataTableHeader } from "@/components/page-speed/lh-categories/table/DataTableHeader";
import { DataTableBody } from "@/components/page-speed/lh-categories/table/DataTableBody";
import { PaginationCard } from "@/components/page-speed/JSUsage/TableControls";
import { createNumericAggregatedCell, createBytesAggregatedCell, createStringAggregatedCell } from "@/components/page-speed/shared/aggregatedCellHelpers";
import { sortByMaxValueComposite } from "@/components/page-speed/shared/dataSortingHelpers";
import { useStandardTable } from "@/components/page-speed/shared/tableConfigHelpers";
import { useTableColumns } from "@/components/page-speed/shared/useTableColumns";

type TopResources = {
  label: string;
  topResources: TableItem[];
};

type TopResourceTableRow = {
  label: string;
  url: string;
  resourceType: string;
  transferSize: number | undefined;
  resourceSize: number | undefined;
  requestTime: number | undefined;
};

type TopResourcesCardProps = {
  stats: TopResources[];
};

const columnHelper = createColumnHelper<TopResourceTableRow>();
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const cols: ColumnDef<TopResourceTableRow, any>[] = [
  columnHelper.accessor('url', {
    id: 'url',
    header: 'URL',
    enableSorting: true,
    enableGrouping: true,
    enableResizing: true,
    filterFn: 'includesString',
    aggregationFn: 'unique',
    cell: (info) => (
      <div className="max-w-75 truncate" title={info.getValue()}>
        {info.getValue()}
      </div>
    ),
  }),
  columnHelper.accessor('resourceType', {
    id: 'resourceType',
    header: 'Type',
    enableSorting: true,
    enableGrouping: true,
    enableResizing: true,
    filterFn: 'includesString',
    aggregationFn: 'unique',
    cell: (info) => toTitleCase(info.getValue()),
    aggregatedCell: createStringAggregatedCell('resourceType', toTitleCase),
  }),
  columnHelper.accessor('transferSize', {
    id: 'transferSize',
    header: 'Transfer Size',
    enableSorting: true,
    enableResizing: true,
    filterFn: 'inNumberRange',
    aggregationFn: 'unique',
    cell: (info) => {
      const value = info.getValue();
      return value !== undefined ? <RenderBytesValue value={value} /> : 'N/A';
    },
    aggregatedCell: createBytesAggregatedCell('transferSize'),
  }),
  columnHelper.accessor('resourceSize', {
    id: 'resourceSize',
    header: 'Resource Size',
    enableSorting: true,
    enableResizing: true,
    filterFn: 'inNumberRange',
    aggregationFn: 'unique',
    cell: (info) => {
      const value = info.getValue();
      return value !== undefined ? <RenderBytesValue value={value} /> : 'N/A';
    },
    aggregatedCell: createBytesAggregatedCell('resourceSize'),
  }),
  columnHelper.accessor('requestTime', {
    id: 'requestTime',
    header: 'Request Time',
    enableSorting: true,
    enableResizing: true,
    filterFn: 'inNumberRange',
    aggregationFn: 'unique',
    cell: (info) => {
      const value = info.getValue();
      return value !== undefined ? <RenderMSValue value={value} /> : 'N/A';
    },
    aggregatedCell: createNumericAggregatedCell('requestTime'),
  }),
];

export function TopResourcesCard({ stats }: TopResourcesCardProps) {
  "use no memo";
  const validStats = useMemo(() => stats.filter(s => s.topResources && s.topResources.length > 0), [stats]);
  const showReportColumn = validStats.length > 1;

  // Combine all top resources with labels
  const data = useMemo<TopResourceTableRow[]>(() => {
    const allRows = validStats.flatMap(({ label, topResources }) =>
      topResources.map((resource: TableItem) => {
        const url = getUrlString(resource.url);
        const resourceType = typeof resource.resourceType === 'string' ? resource.resourceType : 'Unknown';
        const transferSize = getNumber(resource.transferSize);
        const resourceSize = getNumber(resource.resourceSize);
        const networkRequestTime = getNumber(resource.networkRequestTime);
        return {
          label,
          url: url.replace(/^https?:\/\//, '') || 'Unknown',
          resourceType,
          transferSize,
          resourceSize,
          requestTime: networkRequestTime,
        };
      })
    );
    
    return sortByMaxValueComposite(
      allRows,
      (row) => `${row.url}|${row.resourceType}`,
      (row) => row.transferSize || 0,
      validStats.length
    );
  }, [validStats]);

  const columns = useTableColumns<TopResourceTableRow>(cols, columnHelper, showReportColumn);

  const table = useStandardTable({
    data,
    columns,
    grouping: ['url', 'resourceType'],
    enablePagination: true,
    defaultPageSize: 10,
  });

  if (!validStats.length) {
    return null;
  }

  return (
    <Card className="md:col-span-2 lg:col-span-3">
      <CardHeader>
        <CardTitle>Resources by Transfer Size</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="w-full overflow-x-auto">
          <Table className="w-full" style={{ width: '100%' }}>
            <DataTableHeader table={table} />
            <DataTableBody table={table} />
          </Table>
        </div>
        <PaginationCard table={table} showManualControls />
      </CardContent>
    </Card>
  );
}

