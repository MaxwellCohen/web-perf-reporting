"use client";

import { ChevronDown, ChevronUp, Columns3 } from "lucide-react";
import type { RowData } from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import type { StockTable } from "@/features/page-speed-insights/shared/tanstackStockTypes";
import {
  applyMovableOrder,
  columnLayoutLabel,
  isLayoutColumn,
  moveId,
} from "@/features/page-speed-insights/tanstack-table-v9/columnLayout";

const layoutSelector = (state: { columnVisibility: unknown; columnOrder: unknown }) => ({
  columnVisibility: state.columnVisibility,
  columnOrder: state.columnOrder,
});

export function ColumnLayoutControls<TData extends RowData>({
  table,
}: {
  table: StockTable<TData>;
}) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button type="button" variant="outline" size="sm">
          <Columns3 />
          Columns
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-72 p-3">
        <table.Subscribe selector={layoutSelector}>
          {() => {
            const columns = table.getAllLeafColumns().filter(isLayoutColumn);
            const visibleCount = columns.filter((column) => column.getIsVisible()).length;
            return (
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-medium">Columns</p>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      table.resetColumnVisibility();
                      table.resetColumnOrder();
                    }}
                  >
                    Clear
                  </Button>
                </div>
                <ul className="max-h-80 space-y-1 overflow-y-auto">
                  {columns.map((column, index) => {
                    const label = columnLayoutLabel(column);
                    const visible = column.getIsVisible();
                    const onlyVisible = visible && visibleCount <= 1;
                    return (
                      <li key={column.id} className="flex items-center gap-2">
                        <Checkbox
                          id={`column-layout-${column.id}`}
                          checked={visible}
                          disabled={!column.getCanHide() || onlyVisible}
                          onCheckedChange={(value) => column.toggleVisibility(value === true)}
                          aria-label={label}
                        />
                        <label
                          htmlFor={`column-layout-${column.id}`}
                          className="min-w-0 flex-1 truncate text-sm"
                        >
                          {label}
                        </label>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          disabled={index === 0}
                          aria-label={`Move ${label} up`}
                          onClick={() => moveColumn(table, column.id, -1)}
                        >
                          <ChevronUp />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          disabled={index === columns.length - 1}
                          aria-label={`Move ${label} down`}
                          onClick={() => moveColumn(table, column.id, 1)}
                        >
                          <ChevronDown />
                        </Button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            );
          }}
        </table.Subscribe>
      </PopoverContent>
    </Popover>
  );
}

function moveColumn<TData extends RowData>(
  table: StockTable<TData>,
  columnId: string,
  direction: -1 | 1,
): void {
  const allIds = table.getAllLeafColumns().map((column) => column.id);
  const movableIds = table
    .getAllLeafColumns()
    .filter(isLayoutColumn)
    .map((column) => column.id);
  table.setColumnOrder(applyMovableOrder(allIds, moveId(movableIds, columnId, direction)));
}
