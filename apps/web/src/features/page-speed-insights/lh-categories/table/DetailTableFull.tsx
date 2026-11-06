"use client";
import { Fragment, type ReactElement } from "react";
import { SortingState, flexRender, ColumnVisibilityState, useTable } from "@tanstack/react-table";
import clsx from "clsx";
import type { AuditDetailTable } from "@/lib/schema";
import type { CSSProperties } from "react";
import type {
  StockCell,
  StockColumnDef,
  StockRow,
} from "@/features/page-speed-insights/shared/tanstackStockTypes";
import { standardTableFeatures } from "@/features/page-speed-insights/tanstack-table-v9/features";
import { TableCard } from "@/features/page-speed-insights/shared/TableCard";
import { cn } from "@/lib/utils";
import { TableBody, TableCell, TableRow } from "@/components/ui/table";
import {
  getColumnVisibilityState,
  getGroupingState,
} from "@/features/page-speed-insights/tanstack-table-v9/tableStateHelpers";
import { tanstackTableCellDataProps } from "@/features/page-speed-insights/shared/tanstackTableCellDataProps";
import {
  DetailTableDataRow,
  flattenDetailRows,
  getAuditId,
} from "@/features/page-speed-insights/lh-categories/table/detailTableData";
import type { DetailTableItem } from "@/features/page-speed-insights/lh-categories/table/detailTableShared";
import {
  createColumnsFromHeadings,
  extractAllHeadings,
} from "@/features/page-speed-insights/lh-categories/table/detailTableColumns";

/**
 * Calculates default sorting from audit results
 * Only includes columns that actually exist in the table
 */
const calculateDefaultSorting = (
  rows: DetailTableItem[],
  availableColumnIds: Set<string>,
): SortingState => {
  const sortedByKeys = rows
    .flatMap((r) => (r.auditResult?.details as AuditDetailTable)?.sortedBy || [])
    .filter((v, i, a): v is string => !!(v && i === a.indexOf(v)));

  // Map sortedBy keys to actual column IDs that exist
  return sortedByKeys
    .map((key) => {
      // First try exact match
      if (availableColumnIds.has(key)) {
        return { id: key, desc: true };
      }

      // Try to find a column that starts with the key (for user label suffixes)
      // Format: key or key_userLabel
      const matchingId = Array.from(availableColumnIds).find(
        (id) => id === key || id.startsWith(`${key}_`),
      );

      return matchingId ? { id: matchingId, desc: true } : null;
    })
    .filter((v): v is { id: string; desc: boolean } => v !== null);
};

/**
 * Calculates default grouping from columns
 */
const calculateDefaultGrouping = (
  columns: StockColumnDef<DetailTableDataRow, unknown>[],
): string[] => {
  const groupingCandidates = columns
    .filter((c) => c.enableGrouping && c.id && !c.id.includes("_"))
    .map((c) => ({
      id: c.id as string,
      rowType: c.meta?.rowType,
    }));

  if (groupingCandidates.length === 0) {
    // Don't default to 'device' grouping if device column is hidden by default
    const deviceColumn = columns.find((c) => c.id === "device");
    const deviceIsVisible = deviceColumn?.meta?.defaultVisibility !== false;
    return deviceIsVisible ? ["device"] : [];
  }

  const main = groupingCandidates.find((v) => v.rowType === "main");
  const sub = groupingCandidates.find((v) => v.rowType === "sub");

  if (main || sub) {
    return [main?.id, sub?.id].filter(Boolean) as string[];
  }

  return [groupingCandidates[0].id];
};

/**
 * Calculates default column visibility
 */
const calculateDefaultColumnVisibility = (
  columns: StockColumnDef<DetailTableDataRow, unknown>[],
): ColumnVisibilityState => {
  return columns.reduce((acc: ColumnVisibilityState, col) => {
    const id = col.id;
    if (id) {
      acc[id] = !!col.meta?.defaultVisibility;
    }
    return acc;
  }, {});
};

/**
 * Renders a table cell based on its state
 */
const renderTableCell = (
  cell: StockCell<DetailTableDataRow, unknown>,
  row: StockRow<DetailTableDataRow>,
  groupsList: string[],
): ReactElement | null => {
  let cellEl: React.ReactNode = null;

  if (cell.getIsGrouped()) {
    cellEl = flexRender(cell.column.columnDef.cell, cell.getContext());
  } else if (cell.getIsAggregated()) {
    let cellType = cell.column.columnDef.cell;
    if (row.getCanExpand() && groupsList.length > 1 && row.depth < groupsList.length - 1) {
      cellType = cell.column.columnDef.aggregatedCell;
    }
    cellEl = flexRender(cellType, cell.getContext());
  } else if (cell.getIsPlaceholder()) {
    let cellType = cell.column.columnDef.cell;
    if (row.getCanExpand()) {
      cellType = cell.column.columnDef.aggregatedCell;
    }
    cellEl = flexRender(cellType, cell.getContext());
  } else {
    cellEl = flexRender(cell.column.columnDef.cell, cell.getContext());
  }

  if (!cellEl || (typeof cellEl === "object" && !("type" in cellEl))) {
    return null;
  }

  // const isExpanderColumn = cell.column.id === 'expander';

  return (
    <TableCell
      key={cell.id}
      {...tanstackTableCellDataProps(cell, row)}
      className={cn("wrap-break-word transition-all duration-300 ease-in-out")}
      style={{
        width: `${cell.column.getSize()}px`,
        minWidth: `${cell.column.getSize()}px`,
        maxWidth: `${cell.column.getSize()}px`,
        viewTransitionName: `table-cell-${cell.id}`,
      }}
    >
      {cellEl}
    </TableCell>
  );
};

const AUDITS_WITHOUT_EXPANDER_COLUMN = new Set([
  "render-blocking-insight",
  "render-blocking-resources",
  "bootup-time",
]);

export function DetailTableFull({ rows }: { rows: DetailTableItem[] }) {
  const hideExpander = AUDITS_WITHOUT_EXPANDER_COLUMN.has(getAuditId(rows) ?? "");

  // Transform data
  const data = flattenDetailRows(rows);
  // Create columns
  const allHeadings = extractAllHeadings(rows);
  const columns = createColumnsFromHeadings(allHeadings).filter(
    (column) => !(hideExpander && column.id === "expander"),
  );

  // Get available column IDs for validation
  const availableColumnIds = new Set(columns.map((c) => c.id).filter(Boolean) as string[]);

  // Calculate default sorting - only use columns that exist
  const sortbyDefault = calculateDefaultSorting(rows, availableColumnIds);

  // Calculate default grouping
  const defaultGrouping = calculateDefaultGrouping(columns);

  // Calculate column visibility
  const defaultColumnVisibility = calculateDefaultColumnVisibility(columns);

  // Helper function to extract the actual value from a leaf row
  // Leaf rows are not aggregated, so getValue should return the actual value
  const getOriginalValue = (leafRow: StockRow<DetailTableDataRow>, columnId: string): unknown => {
    if (!columnId || columnId === "expander" || columnId === "device") {
      return undefined;
    }

    try {
      // For leaf rows, getValue should return the actual value (not aggregated)
      return leafRow.getValue(columnId);
    } catch {
      return undefined;
    }
  };

  // Create a memoized function to check if rows can expand
  // This checks if leaf rows have different values
  const getRowCanExpandFn = (row: StockRow<DetailTableDataRow>) => {
    if (hideExpander) {
      return false;
    }

    const leafRows = row.getLeafRows();

    // If there's only one or zero leaf rows, no expansion needed
    if (leafRows.length <= 1) {
      return false;
    }

    const columnVisibility = {
      ...defaultColumnVisibility,
      ...getColumnVisibilityState(row.table),
    };

    // Get all visible columns (excluding the expander and device columns)
    const visibleColumns = columns.filter((col) => {
      const colId = col.id;
      if (!colId || colId === "expander" || colId === "device") return false;
      // Column is visible if visibility is not explicitly set to false
      return columnVisibility[colId] !== false;
    });

    // If no visible columns to compare, don't allow expansion
    if (visibleColumns.length === 0) {
      return false;
    }

    // Compare values across all visible columns using original data
    for (const column of visibleColumns) {
      const columnId = column.id;
      if (!columnId) continue;

      const values = leafRows.map((leafRow) => {
        try {
          const value = getOriginalValue(leafRow, columnId);
          // Normalize values for comparison (handle arrays, objects, etc.)
          if (value === undefined || value === null) {
            return null; // Normalize undefined and null to null for comparison
          }
          if (Array.isArray(value)) {
            return JSON.stringify(value);
          }
          if (typeof value === "object") {
            return JSON.stringify(value);
          }
          return value;
        } catch {
          // If extraction fails, treat as null
          return null;
        }
      });

      // Check if all values are the same
      if (values.length === 0) continue;

      const firstValue = values[0];
      const allSame = values.every((val) => {
        // Handle null cases (normalized undefined/null)
        if (firstValue === null) {
          return val === null;
        }
        if (val === null) {
          return false;
        }
        // Deep equality check for objects/arrays (already stringified)
        if (typeof firstValue === "string" && typeof val === "string") {
          // Could be stringified objects/arrays, so compare directly
          return firstValue === val;
        }
        // Direct comparison for primitives
        return firstValue === val;
      });

      // If any column has different values, allow expansion
      if (!allSame) {
        return true;
      }
    }

    // All columns have the same values across all leaf rows
    return false;
  };

  const table = useTable({
    features: standardTableFeatures,
    columns,
    data,
    getRowCanExpand: getRowCanExpandFn,
    enableColumnResizing: true,
    columnResizeMode: "onChange",
    manualPagination: true,
    enableSorting: true,
    enableColumnFilters: true,
    enableColumnPinning: true,
    initialState: {
      sorting: sortbyDefault,
      grouping: defaultGrouping,
      columnVisibility: defaultColumnVisibility,
      columnPinning: {
        end: [],
        start: hideExpander ? [] : ["expander"],
      },
    },
  });

  return (
    <TableCard.Table table={table} className="max-w-full" containerClassName="min-w-0">
      <TableBody className="[&_tr:last-child]:border-(length:--border-width)">
        {table
          .getRowModel()
          .rows.map((row) => {
            const groupsList = getGroupingState(table);
            const parent = row.getParentRow();
            if (parent && !parent.getCanExpand()) {
              return null;
            }

            return (
              <Fragment key={row.id}>
                <TableRow
                  className={clsx(
                    "border-x-(length:--border-width) bg-muted-foreground/10 transition-all duration-300 ease-in-out",
                  )}
                  style={
                    {
                      "--border-width": `${row.depth / 4}rem`,
                      backgroundColor: `hsl(var(--muted-foreground) / ${row.depth / 10})`,
                      viewTransitionName: `table-row-${row.id}`,
                    } as CSSProperties
                  }
                >
                  {row
                    .getVisibleCells()
                    .map((cell) => renderTableCell(cell, row, groupsList))
                    .filter(Boolean)}
                </TableRow>
              </Fragment>
            );
          })
          .filter(Boolean)}
      </TableBody>
    </TableCard.Table>
  );
}
