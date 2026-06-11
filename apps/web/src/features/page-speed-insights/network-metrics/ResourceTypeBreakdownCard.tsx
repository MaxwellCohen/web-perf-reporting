"use client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toTitleCase } from "@/features/page-speed-insights/toTitleCase";
import { TableItem } from "@/lib/schema";
import { useMemo } from "react";
import { StockDataTable } from "@/features/page-speed-insights/tanstack-table-v9/StockDataTable";
import {
  type StandardColumnDef,
} from "@/features/page-speed-insights/tanstack-table-v9/useStandardTable";
import { createStockColumnHelper } from "@/features/page-speed-insights/tanstack-table-v9/createStockColumnHelper";
import {
  createNumericAggregatedCell,
  createStringAggregatedCell,
} from "@/features/page-speed-insights/shared/aggregatedCellHelpers";
import { sortByMaxValue } from "@/features/page-speed-insights/shared/dataSortingHelpers";
import { useStandardTable } from "@/features/page-speed-insights/tanstack-table-v9/useStandardTable";
import { createBytesColumn } from "@/features/page-speed-insights/shared/tableColumnHelpers";
import { useTableColumns } from "@/features/page-speed-insights/shared/useTableColumns";
import { useNetworkRequestStats } from "@/features/page-speed-insights/network-metrics/useNetworkMetricsStore";

type ResourceTypeTableRow = {
  label: string;
  resourceType: string;
  count: number;
  transferSize: number;
  resourceSize: number;
};

function sumOn<T extends Record<string, unknown>>(items: T[], key: string): number {
  return items.reduce((acc, curr) => {
    const value = curr[key];
    return acc + (typeof value === "number" ? value : 0);
  }, 0);
}

const columnHelper = createStockColumnHelper<ResourceTypeTableRow>();
const cols: StandardColumnDef<ResourceTypeTableRow>[] = [
  columnHelper.accessor("resourceType", {
    id: "resourceType",
    header: "Resource Type",
    enableSorting: true,
    enableGrouping: true,
    enableResizing: true,
    filterFn: "includesString",
    cell: (info) => toTitleCase(info.getValue()),
    aggregatedCell: createStringAggregatedCell("resourceType", toTitleCase),
  }),
  columnHelper.accessor("count", {
    id: "count",
    header: "Count",
    enableSorting: true,
    enableResizing: true,
    filterFn: "inNumberRange",
    cell: (info) => <span>{info.getValue()}</span>,
    aggregatedCell: createNumericAggregatedCell("count", (value) => <span>{value}</span>),
  }),
  createBytesColumn(columnHelper, "transferSize", "Total Transfer Size"),
  createBytesColumn(columnHelper, "resourceSize", "Total Resource Size"),
];

function ResourceTypeTable({ label, data }: { label: string; data: ResourceTypeTableRow[] }) {
  const columns = useTableColumns<ResourceTypeTableRow>(cols, columnHelper, false);
  const table = useStandardTable({
    data,
    columns,
  });

  return (
    <div>
      <h5 className="font-semibold text-sm mb-2 text-muted-foreground">{label}</h5>
      <div className="w-full overflow-x-auto">
        <StockDataTable table={table} className="w-full" style={{ width: "100%" }} />
      </div>
    </div>
  );
}

export function ResourceTypeBreakdownCard() {
  const requestStats = useNetworkRequestStats();
  const validStats = useMemo(
    () => requestStats.filter((s) => s.byResourceType && Object.keys(s.byResourceType).length > 0),
    [requestStats],
  );

  const dataByReport = useMemo(() => {
    return validStats.map(({ label, byResourceType }) => {
      const rows = Object.entries(byResourceType).map(([type, items]) => {
        const typedItems = Array.isArray(items) ? (items as TableItem[]) : [];
        return {
          label,
          resourceType: type,
          count: typedItems.length,
          transferSize: sumOn(typedItems, "transferSize"),
          resourceSize: sumOn(typedItems, "resourceSize"),
        };
      });

      return {
        label,
        data: sortByMaxValue(
          rows,
          (row) => row.resourceType,
          (row) => row.transferSize || 0,
          1,
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
