"use client";
import type { StockCellContext } from "@/features/page-speed-insights/shared/tanstackStockTypes";
import { createStockColumnHelper as createColumnHelper } from "@/features/page-speed-insights/tanstack-table-v9/createStockColumnHelper";
import { renderBoolean } from "@/features/page-speed-insights/lh-categories/renderBoolean";
import { StatusCircle } from "@/features/page-speed-insights/JSUsage/StatusCircle";
import { toTitleCase } from "@/features/page-speed-insights/toTitleCase";
import type { TreeMapNode } from "@/lib/schema";
import type { TableFeatures } from "@tanstack/table-core";
import { constructAggregationFn, type RowData } from "@tanstack/react-table";
import { ExpandRow, ExpandAll, RenderBytesCell } from "./jsUsageTableParts";
import { getHostFromUrl } from "@/lib/urlDisplay";

declare module "@tanstack/table-core" {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface ColumnMeta<TFeatures extends TableFeatures, TData extends RowData, TValue> {
    className?: string;
  }
}

const getHostName = (row: TreeMapNode) => getHostFromUrl(row.name);

const columnHelper = createColumnHelper<TreeMapNode>();

const expanderColumn = columnHelper.display({
  id: "expander",
  header: ExpandAll,
  cell: ExpandRow,
  size: 40,
  meta: {
    className: "",
  },
});

const makeStatusColumn = (
  cell: (info: StockCellContext<TreeMapNode, unknown>) => React.JSX.Element,
) =>
  columnHelper.display({
    id: "statusColumn",
    header: () => <></>,
    enableGrouping: true,
    size: 36,
    cell,
    meta: {
      className: "grid place-content-center",
    },
  });

const makeSortableStringColumn = (column: keyof TreeMapNode & string) => {
  return columnHelper.accessor(column, {
    getGroupingValue: (row) => getHostName(row),
    meta: {
      className: "min-w-0 h-auto",
    },
    size: 280,
    minSize: 160,
    header: toTitleCase(column),
    aggregationFn: "unique",
    enableSorting: true,
    filterFn: "includesString",
    cell: (info) => {
      let value: unknown = info.getValue();
      if (Array.isArray(value)) {
        value = getHostFromUrl(String(value[0]));
      }
      return (
        <div className="min-w-0 max-w-full overflow-hidden" title={String(value)}>
          <div className="truncate">{String(value)}</div>
        </div>
      );
    },
  });
};

const makeBooleanColumn = (column: keyof TreeMapNode & string, extra = {}) => {
  return columnHelper.accessor(column, {
    size: 120,
    minSize: 100,
    meta: {
      className: "place-content-center my-2 shrink-0",
    },
    cell: function checkboxItem(info) {
      return <>{renderBoolean(!!info.getValue())}</>;
    },
    ...extra,
  });
};

const makeBytesColumn = (column: keyof TreeMapNode & string, title: string, extra = {}) => {
  return columnHelper.accessor(column, {
    cell: RenderBytesCell,
    sortFn: "basic",
    enableSorting: true,
    sortUndefined: "last",
    header: title,
    enableHiding: true,
    filterFn: "inNumberRange",
    aggregationFn: "sum",
    size: 120,
    minSize: 96,
    meta: {
      className: "h-auto shrink-0",
    },
    ...extra,
  });
};

export const columns = [
  expanderColumn,
  makeStatusColumn((info) => <StatusCircle node={info?.row?.original} />),
  makeSortableStringColumn("name"),
  columnHelper.accessor(getHostName, {
    id: "host",
    size: 180,
    minSize: 120,
    enableHiding: true,
    enablePinning: true,
    enableGrouping: true,
    enableMultiSort: true,
    enableSorting: true,
    sortFn: "basic",
    header: "Host",
    filterFn: "includesString",
    meta: {
      className: "min-w-0",
    },
  }),
  makeBooleanColumn("duplicatedNormalizedModuleName", {
    id: "Duplicated Module",
    header: "Duplicated Module",
  }),
  makeBytesColumn("resourceBytes", "Resource Size"),
  makeBytesColumn("unusedBytes", "Unused Bytes"),

  columnHelper.accessor(
    ({ resourceBytes, unusedBytes }) => {
      if (
        typeof resourceBytes !== "number" ||
        typeof unusedBytes !== "number" ||
        resourceBytes <= 0
      ) {
        return undefined;
      }
      const percent = (unusedBytes / resourceBytes) * 100;
      return percent;
    },
    {
      id: "Percent",
      cell: (info) => {
        const value = info.getValue();
        return (
          <div className="w-full whitespace-nowrap text-right">
            {typeof value === "number" ? `${value.toFixed(2)} %` : value === "" ? "" : "N/A"}
          </div>
        );
      },
      sortFn: "alphanumeric",
      sortUndefined: "last",
      meta: {
        className: "shrink-0",
      },
      aggregationFn: constructAggregationFn({
        aggregate: () => "",
      }) as never,
      aggregatedCell: () => <> </>,
      enableSorting: true,
      enableHiding: true,
      size: 100,
      minSize: 80,
      header: "Percent",
    },
  ),
];
