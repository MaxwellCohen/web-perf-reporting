import { Fragment } from "react";
import { constructAggregationFn } from "@tanstack/react-table";
import type { ItemValueType } from "@/lib/schema";
import type { StockColumnDef } from "@/features/page-speed-insights/shared/tanstackStockTypes";
import { createStockColumnHelper as createColumnHelper } from "@/features/page-speed-insights/tanstack-table-v9/createStockColumnHelper";
import { RenderTableValue } from "@/features/page-speed-insights/lh-categories/table/RenderTableValue";
import { ExpandAll, ExpandRow } from "@/features/page-speed-insights/JSUsage/jsUsageTableParts";
import { toTitleCase } from "@/features/page-speed-insights/toTitleCase";
import {
  UNIQUE_AGG_VALUE_TYPES,
  COLUMN_SIZE_DEFAULT,
  COLUMN_SIZE_LARGE,
  EXPANDER_COLUMN_SIZE,
  DEVICE_COLUMN_SIZE,
} from "@/features/page-speed-insights/lh-categories/table/constants";
import type { DetailTableDataRow } from "@/features/page-speed-insights/lh-categories/table/detailTableData";
import {
  canGroup,
  canSort,
  isNumberColumn,
  type DetailTableItem,
} from "@/features/page-speed-insights/lh-categories/table/detailTableShared";
import type { ColumnHeadingConfig } from "@/features/page-speed-insights/lh-categories/table/detailTableColumnTypes";
import {
  DeviceCell,
  asItemValue,
  detailTableCell,
  isDeviceValuePairArray,
} from "@/features/page-speed-insights/lh-categories/table/detailTableCells";

/**
 * Accessor function for main items in a table row
 */
const accessorFnMainItems =
  (_userLabel: string, key: string) =>
  (r: DetailTableDataRow): unknown => {
    if (_userLabel && r._userLabel !== _userLabel) {
      return undefined;
    }
    const mainItem = r.item?.[key];
    if (typeof mainItem !== "undefined") {
      return mainItem;
    }
    return undefined;
  };

/**
 * Accessor function for sub-items in a table row
 */
const accessorFnSubItems =
  (_userLabel: string, key: string, subItemsHeadingKey: string) =>
  (r: DetailTableDataRow): unknown => {
    if (_userLabel && r._userLabel !== _userLabel) {
      return undefined;
    }
    const subItem = r.subitem?.[subItemsHeadingKey];
    if (typeof subItem !== "undefined") {
      return subItem;
    }
    return r.item?.[key];
  };

/**
 * Checks if a value type should use unique aggregation
 */
const isUniqueAgg = (type: ItemValueType | string): boolean => {
  return UNIQUE_AGG_VALUE_TYPES.includes(type as ItemValueType);
};

/**
 * Returns size settings based on value type
 */
export const setSizeSetting = (type: ItemValueType | string) => {
  return {
    size: isUniqueAgg(type) ? COLUMN_SIZE_LARGE : COLUMN_SIZE_DEFAULT,
  };
};

/**
 * Custom aggregation function that sums values by device/user label
 */
const customSum = constructAggregationFn({
  aggregate: ({ columnId, rows, getValue }) => {
    const aggregationObj = rows.reduce((acc: Record<string, number>, r) => {
      let v: unknown = getValue(r);

      // Extract numeric value from object if needed
      if (v && typeof v === "object" && "value" in v && typeof v.value === "number") {
        v = v.value;
      }

      if (typeof v === "number") {
        const userLabel = (r.getValue("device") as string) || "";
        const cell = r.getAllCells().find((c) => c.column.id === columnId);
        const rowType = cell?.column?.columnDef?.meta?.rowType;

        if (rowType !== "sub") {
          acc[userLabel] = v;
        } else {
          acc[userLabel] = (acc[userLabel] || 0) + v;
        }
      }
      return acc;
    }, {});

    return Object.entries(aggregationObj);
  },
});

const columnHelper = createColumnHelper<DetailTableDataRow>();

/**
 * Determines the aggregation function to use for a column
 */
const getAggregationFn = (
  valueType: ItemValueType | string,
  key: string,
  skipSumming: string[] | undefined,
): "unique" | typeof customSum => {
  if (isUniqueAgg(valueType) || (skipSumming || []).includes(key)) {
    return "unique";
  }
  return customSum;
};

/**
 * Determines the filter function to use for a column
 */
export const getFilterFn = (
  valueType: ItemValueType | string,
): "includesString" | "inNumberRange" | undefined => {
  if (canGroup(valueType)) {
    return "includesString";
  }
  if (isNumberColumn(valueType)) {
    return "inNumberRange";
  }
  return undefined;
};

/**
 * Creates column definitions for a table heading
 */
const makeColumnDef = (h: ColumnHeadingConfig): StockColumnDef<DetailTableDataRow, unknown>[] => {
  const key = h.heading.key;
  const _userLabel = h._userLabel;
  const subItemsHeadingKey = h.heading.subItemsHeading?.key;
  const subItemsHeading = {
    ...h.heading,
    ...(h.heading.subItemsHeading || {}),
  };
  const columnDefs: StockColumnDef<DetailTableDataRow, unknown>[] = [];

  if (!key) {
    return columnDefs;
  }

  const defaultVisibility = !_userLabel && !subItemsHeadingKey;
  const valueType = h.heading.valueType || "text";

  // Main column definition
  columnDefs.push(
    columnHelper.accessor(accessorFnMainItems(_userLabel, key), {
      id: `${key}${_userLabel ? `_${_userLabel}` : ""}`,
      header: `${h.heading.label || toTitleCase(key)}${_userLabel ? ` (${_userLabel})` : ""}`,
      cell: detailTableCell,
      aggregatedCell: detailTableCell,
      enableGrouping: canGroup(valueType),
      enableHiding: true,
      enableSorting: canSort(valueType),
      ...setSizeSetting(valueType),
      aggregationFn: getAggregationFn(valueType, key, h.skipSumming),
      filterFn: getFilterFn(valueType),
      meta: {
        heading: h,
        className: "",
        defaultVisibility,
        rowType: subItemsHeadingKey ? "main" : undefined,
        headerType: "group",
      },
    }),
  );

  // Sub-items column definition (if applicable)
  if (subItemsHeadingKey) {
    const subValueType = subItemsHeading.valueType || "text";
    columnDefs.push(
      columnHelper.accessor(accessorFnSubItems(_userLabel, key, subItemsHeadingKey), {
        id: `${key}${subItemsHeadingKey}${_userLabel ? `_${_userLabel}` : ""}`,
        header: `${subItemsHeading.label || ""}${_userLabel ? ` (${_userLabel})` : ""}`,
        cell: detailTableCell,
        enableGrouping: canGroup(subValueType),
        ...setSizeSetting(subValueType),
        enableHiding: true,
        enableSorting: canSort(subValueType),
        aggregationFn: getAggregationFn(subValueType, subItemsHeadingKey, h.skipSumming),
        filterFn: getFilterFn(subValueType),
        aggregatedCell(info) {
          const value = accessorFnMainItems(_userLabel, key)(info.row.original);

          if (isDeviceValuePairArray(value)) {
            return (
              <>
                {value.map((v, i) => (
                  <Fragment key={i}>
                    <RenderTableValue value={v[1]} heading={h.heading} device={v[0]} />
                  </Fragment>
                ))}
              </>
            );
          }

          return (
            <RenderTableValue value={asItemValue(value)} heading={h.heading} device={_userLabel} />
          );
        },
        meta: {
          heading: {
            heading: subItemsHeading,
            _userLabel: h._userLabel,
          },
          className: "",
          defaultVisibility: !_userLabel,
          rowType: "sub",
        },
      }),
    );
  }

  return columnDefs;
};

/**
 * Transforms audit result items into table data rows
 */
export const extractAllHeadings = (rows: DetailTableItem[]): ColumnHeadingConfig[] => {
  return rows
    .flatMap((r) =>
      (r.auditResult?.details?.headings || []).map((h) =>
        !h.key
          ? []
          : [
              {
                heading: h,
                skipSumming: r.auditResult?.details?.skipSumming,
                _userLabel: r._userLabel,
              },
            ],
      ),
    )
    .flat(2);
};

/**
 * Creates column definitions from headings for a multi-report table
 */
export const createColumnsFromHeadings = (
  allHeadings: ColumnHeadingConfig[],
): StockColumnDef<DetailTableDataRow, unknown>[] => {
  const columnMap: Record<string, StockColumnDef<DetailTableDataRow, unknown>> = {
    expander: getExpandingControlColumn(),
  };

  // Add base columns (without user label)
  allHeadings.forEach((h) => {
    makeColumnDef({ ...h, _userLabel: "" }).forEach((col) => {
      if (col?.id && !columnMap[col.id]) {
        columnMap[col.id] = col;
      }
    });
  });

  // Add user-label specific columns
  allHeadings.forEach((h) => {
    makeColumnDef(h).forEach((col) => {
      if (col?.id && !columnMap[col.id]) {
        columnMap[col.id] = col;
      }
    });
  });

  columnMap.device = columnHelper.accessor((r): unknown => r?._userLabel ?? "", {
    id: "device",
    header: "Report type(s)",
    enableHiding: true,
    enableGrouping: false,
    enableSorting: true,
    aggregationFn: "unique",
    size: DEVICE_COLUMN_SIZE,
    cell: DeviceCell,
    aggregatedCell: DeviceCell,
    meta: {
      defaultVisibility: false,
    },
  });

  return Object.values(columnMap).filter(Boolean);
};

/**
 * Returns the column definition for the expand/collapse control column
 */
export function getExpandingControlColumn(): StockColumnDef<DetailTableDataRow, unknown> {
  return columnHelper.display({
    id: "expander",
    header: ExpandAll,
    cell: ExpandRow,
    aggregatedCell: ExpandRow,
    size: EXPANDER_COLUMN_SIZE,
    enableHiding: false,
    enableGrouping: false,
    enablePinning: true,
    enableSorting: false,
    enableResizing: false,
    meta: {
      defaultVisibility: true,
    },
  });
}
