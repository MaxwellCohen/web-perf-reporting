import React, { type ComponentType } from "react";
import type { RowData } from "@tanstack/react-table";
import type { StockColumnDef } from "@/features/page-speed-insights/shared/tanstackStockTypes";
import type { StockColumnHelper } from "@/features/page-speed-insights/tanstack-table-v9/createStockColumnHelper";
import {
  RenderBytesValue,
  RenderMSValue,
} from "@/features/page-speed-insights/lh-categories/table/RenderTableValue";
import {
  createBytesAggregatedCell,
  createNumericAggregatedCell,
  createPercentageAggregatedCell,
  createReportLabelAggregatedCell,
  createStringAggregatedCell,
} from "@/features/page-speed-insights/shared/aggregatedCellHelpers";
import { ResourceUrlCell } from "@/features/page-speed-insights/shared/ResourceUrlCell";

type ColumnDef<T extends RowData, TValue = unknown> = StockColumnDef<T, TValue>;
type ColumnHelper<T extends RowData> = StockColumnHelper<T>;

/** Placeholder for missing numeric / metric values in grouped metric tables */
export const METRIC_TABLE_EMPTY_DISPLAY = "N/A" as const;

export function metricTableEmptyDisplay(): React.ReactNode {
  return METRIC_TABLE_EMPTY_DISPLAY;
}

export function createOptionalNumericCell(
  Render: ComponentType<{ value: number }>,
  value: number | undefined,
): React.ReactNode {
  return value !== undefined ? <Render value={value} /> : metricTableEmptyDisplay();
}

/** Treat missing or non-positive numbers as empty (recommendations / wasted metrics). */
export function createOptionalPositiveNumericCell(
  Render: ComponentType<{ value: number }>,
  value: number | undefined,
): React.ReactNode {
  return value !== undefined && value > 0 ? <Render value={value} /> : metricTableEmptyDisplay();
}

export type NumericColumnOptions = {
  requirePositive?: boolean;
  size?: number;
  minSize?: number;
  maxSize?: number;
};

function createBaseNumericColumn<T extends RowData, TValue = unknown>(
  columnHelper: ColumnHelper<T>,
  accessor: keyof T,
  header: string,
  cell: ColumnDef<T, TValue>["cell"],
  aggregatedCell: ColumnDef<T, TValue>["aggregatedCell"],
  sizeOptions?: Pick<NumericColumnOptions, "size" | "minSize" | "maxSize">,
): ColumnDef<T, TValue> {
  const id = String(accessor);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return columnHelper.accessor(accessor as any, {
    id,
    header,
    enableSorting: true,
    enableResizing: true,
    filterFn: "inNumberRange",
    aggregationFn: "unique",
    cell,
    aggregatedCell,
    ...(sizeOptions?.size !== undefined ? { size: sizeOptions.size } : {}),
    ...(sizeOptions?.minSize !== undefined ? { minSize: sizeOptions.minSize } : {}),
    ...(sizeOptions?.maxSize !== undefined ? { maxSize: sizeOptions.maxSize } : {}),
  });
}

export type TruncatedTextColumnOptions<T> = {
  accessor: keyof T;
  id: string;
  header: string;
  maxWidthClass?: string;
  enableGrouping?: boolean;
};

/**
 * Text column with truncation + title tooltip; string aggregation for grouped rows.
 */
export function createTruncatedTextColumn<T extends RowData>(
  columnHelper: ColumnHelper<T>,
  options: TruncatedTextColumnOptions<T>,
): ColumnDef<T, unknown> {
  const { accessor, id, header, maxWidthClass = "max-w-75", enableGrouping = true } = options;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return columnHelper.accessor(accessor as any, {
    id,
    header,
    enableSorting: true,
    enableGrouping,
    enableResizing: true,
    filterFn: "includesString",
    aggregationFn: "unique",
    cell: (info) => {
      const raw = info.getValue() as string;
      return (
        <div className={`${maxWidthClass} truncate`} title={raw}>
          {raw}
        </div>
      );
    },
    aggregatedCell: createStringAggregatedCell(id, undefined, false),
  });
}

export type URLColumnOptions = {
  maxWidthClass?: string;
  header?: string;
  enableGrouping?: boolean;
  size?: number;
  minSize?: number;
  maxSize?: number;
  /** Shown when url is missing or equals this sentinel (e.g. "Unattributable"). */
  emptyLabel?: string;
};

/**
 * Standard URL column using ResourceUrlCell; expects row shape `{ url: string }`.
 * Pass a max-width class string for backwards compatibility, or an options object.
 */
export function createURLColumn<T extends { url: string } & RowData>(
  columnHelper: ColumnHelper<T>,
  maxWidthClassOrOptions: string | URLColumnOptions = "max-w-75",
): ColumnDef<T, unknown> {
  const options: URLColumnOptions =
    typeof maxWidthClassOrOptions === "string"
      ? { maxWidthClass: maxWidthClassOrOptions }
      : maxWidthClassOrOptions;

  const {
    maxWidthClass = "max-w-75",
    header = "URL",
    enableGrouping = true,
    size,
    minSize,
    maxSize,
    emptyLabel,
  } = options;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return columnHelper.accessor("url" as any, {
    id: "url",
    header,
    enableSorting: true,
    enableGrouping,
    enableResizing: true,
    ...(size !== undefined ? { size } : {}),
    ...(minSize !== undefined ? { minSize } : {}),
    ...(maxSize !== undefined ? { maxSize } : {}),
    filterFn: "includesString",
    aggregationFn: "unique",
    cell: (info) => {
      const url = info.getValue() as string;
      if (!url || (emptyLabel !== undefined && url === emptyLabel)) {
        return (
          <span className="text-muted-foreground">{emptyLabel ?? metricTableEmptyDisplay()}</span>
        );
      }
      return (
        <div className={cnMinWidth(maxWidthClass)}>
          <ResourceUrlCell url={url} />
        </div>
      );
    },
    aggregatedCell: createStringAggregatedCell("url", undefined, false),
  });
}

function cnMinWidth(maxWidthClass: string): string {
  return `min-w-0 overflow-hidden ${maxWidthClass}`;
}

/**
 * Optional milliseconds column with grouped multi-report aggregation.
 */
export function createMSColumn<T extends RowData>(
  columnHelper: ColumnHelper<T>,
  accessor: keyof T,
  header: string,
  options: NumericColumnOptions = {},
): ColumnDef<T, unknown> {
  const id = String(accessor);
  const cellFn = options.requirePositive
    ? createOptionalPositiveNumericCell
    : createOptionalNumericCell;
  return createBaseNumericColumn(
    columnHelper,
    accessor,
    header,
    (info) => cellFn(RenderMSValue, info.getValue() as number | undefined),
    createNumericAggregatedCell(id),
    options,
  );
}

/**
 * Optional numeric column using a custom renderer (e.g. bytes).
 */
function createOptionalNumericColumn<T extends RowData>(
  columnHelper: ColumnHelper<T>,
  options: {
    accessor: keyof T;
    header: string;
    Render: ComponentType<{ value: number }>;
    aggregatedColumnId: string;
    aggregatedCellFactory?: typeof createNumericAggregatedCell;
    requirePositive?: boolean;
    size?: number;
    minSize?: number;
    maxSize?: number;
  },
): ColumnDef<T, unknown> {
  const {
    accessor,
    header,
    Render,
    aggregatedColumnId,
    aggregatedCellFactory = createNumericAggregatedCell,
    requirePositive,
    size,
    minSize,
    maxSize,
  } = options;

  const cellFn = requirePositive ? createOptionalPositiveNumericCell : createOptionalNumericCell;

  return createBaseNumericColumn(
    columnHelper,
    accessor,
    header,
    (info) => cellFn(Render, info.getValue() as number | undefined),
    aggregatedCellFactory(aggregatedColumnId),
    { size, minSize, maxSize },
  );
}

/**
 * Standard bytes column definition
 */
export function createBytesColumn<T extends RowData>(
  columnHelper: ColumnHelper<T>,
  accessor: keyof T,
  header: string,
  options: NumericColumnOptions = {},
): ColumnDef<T, unknown> {
  return createOptionalNumericColumn(columnHelper, {
    accessor,
    header,
    Render: RenderBytesValue,
    aggregatedColumnId: String(accessor),
    aggregatedCellFactory: createBytesAggregatedCell,
    ...options,
  });
}

/**
 * Percentage column (leaf + aggregated) for grouped metric tables.
 */
export function createPercentageColumn<T extends RowData>(
  columnHelper: ColumnHelper<T>,
  accessor: keyof T,
  header: string,
  precisionOrOptions: number | (NumericColumnOptions & { precision?: number }) = 1,
): ColumnDef<T, unknown> {
  const options: NumericColumnOptions & { precision?: number } =
    typeof precisionOrOptions === "number"
      ? { precision: precisionOrOptions }
      : precisionOrOptions;
  const precision = options.precision ?? 1;
  const id = String(accessor);
  return createBaseNumericColumn(
    columnHelper,
    accessor,
    header,
    (info) => {
      const value = info.getValue() as number | undefined;
      if (options.requirePositive) {
        return value !== undefined && value > 0
          ? `${value.toFixed(precision)}%`
          : metricTableEmptyDisplay();
      }
      return value !== undefined ? `${value.toFixed(precision)}%` : metricTableEmptyDisplay();
    },
    createPercentageAggregatedCell(id, precision),
    options,
  );
}

/**
 * Standard report label column definition
 */
export function createReportColumn<T extends { label: string } & RowData>(
  columnHelper: ColumnHelper<T>,
): ColumnDef<T, unknown> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return columnHelper.accessor("label" as any, {
    id: "label",
    header: "Report",
    enableSorting: true,
    enableResizing: true,
    filterFn: "includesString",
    aggregationFn: "unique",
    aggregatedCell: createReportLabelAggregatedCell("label"),
  });
}
