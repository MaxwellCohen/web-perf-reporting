"use client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table } from "@/components/ui/table";
import { RenderBytesValue } from "@/components/page-speed/lh-categories/table/RenderTableValue";
import { toTitleCase } from "@/components/page-speed/toTitleCase";
import { TableItem } from "@/lib/schema";
import { useMemo } from "react";
import {
  ColumnDef,
  createColumnHelper,
} from "@tanstack/react-table";
import { DataTableHeader } from "@/components/page-speed/lh-categories/table/DataTableHeader";
import { DataTableBody } from "@/components/page-speed/lh-categories/table/DataTableBody";
import { createNumericAggregatedCell, createBytesAggregatedCell, createStringAggregatedCell } from "@/components/page-speed/shared/aggregatedCellHelpers";
import { sortByMaxValue } from "@/components/page-speed/shared/dataSortingHelpers";
import { useStandardTable } from "@/components/page-speed/shared/tableConfigHelpers";
import { useTableColumns } from "@/components/page-speed/shared/useTableColumns";

type ResourceTypeBreakdown = {
  label: string;
  byResourceType: Record<string, TableItem[]>;
};

type ResourceTypeTableRow = {
  label: string;
  resourceType: string;
  count: number;
  transferSize: number;
  resourceSize: number;
};

type ResourceTypeBreakdownCardProps = {
  stats: ResourceTypeBreakdown[];
};

function sumOn<T extends Record<string, unknown>>(items: T[], key: string): number {
  return items.reduce((acc, curr) => {
    const value = curr[key];
    return acc + (typeof value === 'number' ? value : 0);
  }, 0);
}

const columnHelper = createColumnHelper<ResourceTypeTableRow>();
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const cols: ColumnDef<ResourceTypeTableRow, any>[] = [
  columnHelper.accessor('resourceType', {
    id: 'resourceType',
    header: 'Resource Type',
    enableSorting: true,
    enableGrouping: true,
    enableResizing: true,
    filterFn: 'includesString',
    cell: (info) => toTitleCase(info.getValue()),
    aggregatedCell: createStringAggregatedCell('resourceType', toTitleCase),
  }),
  columnHelper.accessor('count', {
    id: 'count',
    header: 'Count',
    enableSorting: true,
    enableResizing: true,
    filterFn: 'inNumberRange',
    cell: (info) => <span>{info.getValue()}</span>,
    aggregatedCell: createNumericAggregatedCell('count', (value) => <span>{value}</span>),
  }),
  columnHelper.accessor('transferSize', {
    id: 'transferSize',
    header: 'Total Transfer Size',
    enableSorting: true,
    enableResizing: true,
    filterFn: 'inNumberRange',
    cell: (info) => <RenderBytesValue value={info.getValue()} />,
    aggregatedCell: createBytesAggregatedCell('transferSize'),
  }),
  columnHelper.accessor('resourceSize', {
    id: 'resourceSize',
    header: 'Total Resource Size',
    enableSorting: true,
    enableResizing: true,
    filterFn: 'inNumberRange',
    cell: (info) => <RenderBytesValue value={info.getValue()} />,
    aggregatedCell: createBytesAggregatedCell('resourceSize'),
  }),
];

function ResourceTypeTable({ label, data }: { label: string; data: ResourceTypeTableRow[] }) {
  "use no memo";
  const columns = useTableColumns<ResourceTypeTableRow>(cols, columnHelper, false);
  const table = useStandardTable({
    data,
    columns,
  });

  return (
    <div>
      <h5 className="font-semibold text-sm mb-2 text-muted-foreground">
        {label}
      </h5>
      <div className="w-full overflow-x-auto">
        <Table className="w-full" style={{ width: '100%' }}>
          <DataTableHeader table={table} />
          <DataTableBody table={table} />
        </Table>
      </div>
    </div>
  );
}

export function ResourceTypeBreakdownCard({ stats }: ResourceTypeBreakdownCardProps) {
  const validStats = useMemo(() => stats.filter(s => s.byResourceType && Object.keys(s.byResourceType).length > 0), [stats]);

  // Create data for each report separately
  const dataByReport = useMemo(() => {
    return validStats.map(({ label, byResourceType }) => {
      const rows = Object.entries(byResourceType).map(([type, items]) => {
        const typedItems = Array.isArray(items) ? items as TableItem[] : [];
        return {
          label,
          resourceType: type,
          count: typedItems.length,
          transferSize: sumOn(typedItems, 'transferSize'),
          resourceSize: sumOn(typedItems, 'resourceSize'),
        };
      });
      
      return {
        label,
        data: sortByMaxValue(
          rows,
          (row) => row.resourceType,
          (row) => row.transferSize || 0,
          1
        ),
      };
    });
  }, [validStats]);

  if (!validStats.length) {
    return null;
  }
  
  return (
    <Card className="md:col-span-2 lg:col-span-3">
      <CardHeader>
        <CardTitle>Resource Type Breakdown</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {dataByReport.map(({ label, data }) => (
            <ResourceTypeTable key={label} label={label} data={data} />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

