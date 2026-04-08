import React, { type ComponentType } from "react";
import { ColumnDef, createColumnHelper } from "@tanstack/react-table";
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

function createBaseNumericColumn<T, TValue = unknown>(
  columnHelper: ReturnType<typeof createColumnHelper<T>>,
  accessor: keyof T,
  header: string,
  cell: ColumnDef<T, TValue>["cell"],
  aggregatedCell: ColumnDef<T, TValue>["aggregatedCell"],
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
export function createTruncatedTextColumn<T>(
  columnHelper: ReturnType<typeof createColumnHelper<T>>,
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

/**
 * Standard URL column (truncated); expects row shape `{ url: string }`.
 */
export function createURLColumn<T extends { url: string }>(
  columnHelper: ReturnType<typeof createColumnHelper<T>>,
  maxWidthClass: string = "max-w-75",
): ColumnDef<T, unknown> {
  return createTruncatedTextColumn(columnHelper, {
    accessor: "url" as keyof T & string,
    id: "url",
    header: "URL",
    maxWidthClass,
    enableGrouping: true,
  });
}

/**
 * Optional milliseconds column with grouped multi-report aggregation.
 */
export function createMSColumn<T>(
  columnHelper: ReturnType<typeof createColumnHelper<T>>,
  accessor: keyof T,
  header: string,
): ColumnDef<T, unknown> {
  const id = String(accessor);
  return createBaseNumericColumn(
    columnHelper,
    accessor,
    header,
    (info) => createOptionalNumericCell(RenderMSValue, info.getValue() as number | undefined),
    createNumericAggregatedCell(id),
  );
}

/**
 * Optional numeric column using a custom renderer (e.g. bytes).
 */
export function createOptionalNumericColumn<T>(
  columnHelper: ReturnType<typeof createColumnHelper<T>>,
  options: {
    accessor: keyof T;
    header: string;
    Render: ComponentType<{ value: number }>;
    aggregatedColumnId: string;
    aggregatedCellFactory?: typeof createNumericAggregatedCell;
  },
): ColumnDef<T, unknown> {
  const {
    accessor,
    header,
    Render,
    aggregatedColumnId,
    aggregatedCellFactory = createNumericAggregatedCell,
  } = options;
  const id = String(accessor);

  return createBaseNumericColumn(
    columnHelper,
    accessor,
    header,
    (info) => createOptionalNumericCell(Render, info.getValue() as number | undefined),
    aggregatedCellFactory(aggregatedColumnId),
  );
}

/**
 * Standard bytes column definition
 */
export function createBytesColumn<T>(
  columnHelper: ReturnType<typeof createColumnHelper<T>>,
  accessor: keyof T,
  header: string,
): ColumnDef<T, unknown> {
  return createOptionalNumericColumn(columnHelper, {
    accessor,
    header,
    Render: RenderBytesValue,
    aggregatedColumnId: String(accessor),
    aggregatedCellFactory: createBytesAggregatedCell,
  });
}

/**
 * Percentage column (leaf + aggregated) for grouped metric tables.
 */
export function createPercentageColumn<T>(
  columnHelper: ReturnType<typeof createColumnHelper<T>>,
  accessor: keyof T,
  header: string,
  precision: number = 1,
): ColumnDef<T, unknown> {
  const id = String(accessor);
  return createBaseNumericColumn(
    columnHelper,
    accessor,
    header,
    (info) => {
      const value = info.getValue() as number | undefined;
      return value !== undefined ? `${value.toFixed(precision)}%` : metricTableEmptyDisplay();
    },
    createPercentageAggregatedCell(id, precision),
  );
}

/**
 * Standard report label column definition
 */
export function createReportColumn<T extends { label: string }>(
  columnHelper: ReturnType<typeof createColumnHelper<T>>,
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
