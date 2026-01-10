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
import { createNumericAggregatedCell, createBytesAggregatedCell, createStringAggregatedCell, createReportLabelAggregatedCell } from "@/components/page-speed/shared/aggregatedCellHelpers";
import { sortByMaxValue } from "@/components/page-speed/shared/dataSortingHelpers";
import { useStandardTable } from "@/components/page-speed/shared/tableConfigHelpers";

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

export function ResourceTypeBreakdownCard({ stats }: ResourceTypeBreakdownCardProps) {
  "use no memo";
  const validStats = useMemo(() => stats.filter(s => s.byResourceType && Object.keys(s.byResourceType).length > 0), [stats]);


  const showReportColumn = validStats.length > 1;

  // Combine all resource type data with labels
  const data = useMemo<ResourceTypeTableRow[]>(() => {
    const allRows = validStats.flatMap(({ label, byResourceType }) =>
      Object.entries(byResourceType).map(([type, items]) => {
        const typedItems = Array.isArray(items) ? items as TableItem[] : [];
        return {
          label,
          resourceType: type,
          count: typedItems.length,
          transferSize: sumOn(typedItems, 'transferSize'),
          resourceSize: sumOn(typedItems, 'resourceSize'),
        };
      })
    );
    
    return sortByMaxValue(
      allRows,
      (row) => row.resourceType,
      (row) => row.transferSize || 0,
      validStats.length
    );
  }, [validStats]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const columns = useMemo<ColumnDef<ResourceTypeTableRow, any>[]>(() => {
    const columnHelper = createColumnHelper<ResourceTypeTableRow>();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const cols: ColumnDef<ResourceTypeTableRow, any>[] = [];
    
    cols.push(
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
    grouping: ['resourceType'],
  });


  if (!validStats.length) {
    return null;
  }
  return (
    <Card className="md:col-span-2 lg:col-span-3">
      <CardHeader>
        <CardTitle>Resource Type Breakdown</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="w-full overflow-x-auto">
          <Table className="w-full" style={{ width: '100%' }}>
            <DataTableHeader table={table} />
            <DataTableBody table={table} />
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}

