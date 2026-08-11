"use client";
import { toTitleCase } from "@/features/page-speed-insights/toTitleCase";
import { TableItem } from "@/lib/schema";
import { getUrlString, getNumber } from "@/lib/utils";
import { useMemo } from "react";
import { createStringAggregatedCell } from "@/features/page-speed-insights/shared/aggregatedCellHelpers";
import {
  useStandardTable,
  type StandardColumnDef,
} from "@/features/page-speed-insights/tanstack-table-v9/useStandardTable";
import { createStockColumnHelper } from "@/features/page-speed-insights/tanstack-table-v9/createStockColumnHelper";
import {
  createBytesColumn,
  createMSColumn,
  createURLColumn,
} from "@/features/page-speed-insights/shared/tableColumnHelpers";
import { useTableColumns } from "@/features/page-speed-insights/shared/useTableColumns";
import {
  LabeledStockTable,
  MultiReportTableCard,
} from "@/features/page-speed-insights/shared/TableCard";
import { useNetworkRequestStats } from "@/features/page-speed-insights/network-metrics/useNetworkMetricsStore";

type TopResourceTableRow = {
  url: string;
  resourceType: string;
  transferSize: number | undefined;
  resourceSize: number | undefined;
  requestTime: number | undefined;
};

function resourceToTableRow(resource: TableItem): TopResourceTableRow {
  const url = getUrlString(resource.url) || "Unknown";
  const resourceType =
    typeof resource.resourceType === "string" ? resource.resourceType : "Unknown";
  return {
    url,
    resourceType,
    transferSize: getNumber(resource.transferSize),
    resourceSize: getNumber(resource.resourceSize),
    requestTime: getNumber(resource.networkRequestTime),
  };
}

const columnHelper = createStockColumnHelper<TopResourceTableRow>();
const cols: StandardColumnDef<TopResourceTableRow>[] = [
  createURLColumn(columnHelper),
  columnHelper.accessor("resourceType", {
    id: "resourceType",
    header: "Type",
    enableSorting: true,
    enableGrouping: true,
    enableResizing: true,
    filterFn: "includesString",
    aggregationFn: "unique",
    cell: (info) => toTitleCase(info.getValue()),
    aggregatedCell: createStringAggregatedCell("resourceType", toTitleCase),
  }),
  createBytesColumn(columnHelper, "transferSize", "Transfer Size"),
  createBytesColumn(columnHelper, "resourceSize", "Resource Size"),
  createMSColumn(columnHelper, "requestTime", "Request Time"),
];

function TopResourcesTable({ label, data }: { label: string; data: TopResourceTableRow[] }) {
  const columns = useTableColumns<TopResourceTableRow>(cols, columnHelper, false);
  const table = useStandardTable({
    data,
    columns,
    enablePagination: true,
    defaultPageSize: 10,
  });

  return <LabeledStockTable label={label} table={table} showPagination />;
}

export function TopResourcesCard() {
  const requestStats = useNetworkRequestStats();
  const validStats = useMemo(
    () => requestStats.filter((s) => s.topResources && s.topResources.length > 0),
    [requestStats],
  );

  const dataByReport = useMemo(
    () =>
      validStats.map(({ label, topResources }) => ({
        label,
        data: topResources.map((resource: TableItem) => resourceToTableRow(resource)),
      })),
    [validStats],
  );

  if (!validStats.length) {
    return null;
  }

  return (
    <MultiReportTableCard
      title="Resources by Transfer Size"
      className="md:col-span-2 lg:col-span-3"
    >
      {dataByReport.map(({ label, data }) => (
        <TopResourcesTable key={label} label={label} data={data} />
      ))}
    </MultiReportTableCard>
  );
}
