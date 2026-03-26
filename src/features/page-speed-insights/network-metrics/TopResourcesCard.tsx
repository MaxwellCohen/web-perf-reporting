"use client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table } from "@/components/ui/table";
import { toTitleCase } from "@/features/page-speed-insights/toTitleCase";
import { TableItem } from "@/lib/schema";
import { getUrlString, getNumber } from "@/lib/utils";
import { useMemo } from "react";
import {
  ColumnDef,
  createColumnHelper,
} from "@tanstack/react-table";
import { DataTableHeader } from "@/features/page-speed-insights/lh-categories/table/DataTableHeader";
import { DataTableBody } from "@/features/page-speed-insights/lh-categories/table/DataTableBody";
import { PaginationCard } from "@/features/page-speed-insights/JSUsage/TableControls";
import { createStringAggregatedCell } from "@/features/page-speed-insights/shared/aggregatedCellHelpers";
import { sortByMaxValueComposite } from "@/features/page-speed-insights/shared/dataSortingHelpers";
import { useStandardTable } from "@/features/page-speed-insights/shared/tableConfigHelpers";
import {
  createBytesColumn,
  createMSColumn,
  createURLColumn,
} from "@/features/page-speed-insights/shared/tableColumnHelpers";
import { useTableColumns } from "@/features/page-speed-insights/shared/useTableColumns";
import { useNetworkRequestStats } from "@/features/page-speed-insights/network-metrics/useNetworkMetricsStore";

type TopResourceTableRow = {
  label: string;
  url: string;
  resourceType: string;
  transferSize: number | undefined;
  resourceSize: number | undefined;
  requestTime: number | undefined;
};

const URL_PROTOCOL_REGEX = /^https?:\/\//;

function resourceToTableRow(label: string, resource: TableItem): TopResourceTableRow {
  const url = getUrlString(resource.url).replace(URL_PROTOCOL_REGEX, '') || 'Unknown';
  const resourceType = typeof resource.resourceType === 'string' ? resource.resourceType : 'Unknown';
  return {
    label,
    url,
    resourceType,
    transferSize: getNumber(resource.transferSize),
    resourceSize: getNumber(resource.resourceSize),
    requestTime: getNumber(resource.networkRequestTime),
  };
}

const columnHelper = createColumnHelper<TopResourceTableRow>();
const cols: ColumnDef<TopResourceTableRow, any>[] = [
  createURLColumn(columnHelper),
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
  createBytesColumn(columnHelper, 'transferSize', 'Transfer Size'),
  createBytesColumn(columnHelper, 'resourceSize', 'Resource Size'),
  createMSColumn(columnHelper, 'requestTime', 'Request Time'),
];

export function TopResourcesCard() {
  "use no memo";
  const requestStats = useNetworkRequestStats();
  const validStats = useMemo(
    () =>
      requestStats.filter(
        (s) => s.topResources && s.topResources.length > 0,
      ),
    [requestStats],
  );
  const showReportColumn = validStats.length > 1;

  const data = useMemo<TopResourceTableRow[]>(() => {
    const allRows = validStats.flatMap(({ label, topResources }) =>
      topResources.map((resource: TableItem) => resourceToTableRow(label, resource))
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
          <Table className="w-full">
            <DataTableHeader table={table} />
            <DataTableBody table={table} />
          </Table>
        </div>
        <PaginationCard table={table} showManualControls />
      </CardContent>
    </Card>
  );
}
