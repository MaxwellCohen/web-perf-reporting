/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import { useCallback, useEffect, useId, useRef } from "react";
import type { HeaderContext } from "@tanstack/react-table";
import {
  RenderBytesValue,
  RenderMSValue,
  RenderTableValue,
} from "@/features/page-speed-insights/lh-categories/table/RenderTableValue";
import { Slider2 } from "@/components/ui/slider";
import type { ColumnFiltersColumnDef } from "@tanstack/react-table";
import type { TreeMapNode } from "@/lib/schema";
import type { ReactNode } from "react";

export function useDebouncedCallback(callback: (...arg: any[]) => any, delay = 100) {
  const timerIdRef = useRef<null | ReturnType<typeof setTimeout>>(null);
  const latestCallback = useRef(callback);

  useEffect(() => {
    latestCallback.current = callback;
  }, [callback]);

  const debouncedCallback = useCallback(
    (...args: any[]) => {
      if (timerIdRef.current) {
        clearTimeout(timerIdRef.current);
      }

      timerIdRef.current = setTimeout(() => {
        latestCallback.current(...args);
      }, delay);
    },
    [delay],
  );

  useEffect(() => {
    return () => {
      if (timerIdRef.current) {
        clearTimeout(timerIdRef.current);
      }
    };
  }, []);

  return debouncedCallback;
}

const BYTES_KEYWORDS = ["size", "bytes"];
const MS_KEYWORDS = [
  "time",
  "duration",
  "rtt",
  "latency",
  "total",
  "scripting",
  "parse",
  "compile",
  "ms",
];

export function formatFilterValue(value: number, columnId: string, header?: string): ReactNode {
  const search = `${columnId} ${header ?? ""}`.toLowerCase();

  if (BYTES_KEYWORDS.some((k) => search.includes(k))) {
    return <RenderBytesValue value={value} />;
  }
  if (MS_KEYWORDS.some((k) => search.includes(k))) {
    return <RenderMSValue value={value} />;
  }
  return <span>{value.toLocaleString("en-US")}</span>;
}

export function RangeFilter<T>({ column }: Pick<HeaderContext<T, unknown>, "column">) {
  const id = useId();
  const [minValue, maxValue] = (column.getFacetedMinMaxValues() as [number, number]) ?? [0, 100];
  const [fMin, fMax] = (column.getFilterValue() as [number, number]) ?? [minValue, maxValue];
  const updateFilter = useDebouncedCallback((value: [number, number]) => {
    column.setFilterValue(value);
  }, 300);

  const columnId = column.id;
  const header = typeof column.columnDef.header === "string" ? column.columnDef.header : undefined;

  const hasHeadingMeta = !!column.columnDef.meta?.heading?.heading;

  return (
    <div className="box-border w-full min-w-0 max-w-full p-2">
      <div className="relative w-full min-w-0 space-y-3">
        <div className="flex min-w-0 items-center justify-between gap-2">
          <span className="shrink-0 text-xs font-medium text-muted-foreground">Min</span>
          <div className="min-w-0 truncate text-right text-sm font-semibold">
            {hasHeadingMeta ? (
              <RenderTableValue
                value={fMin}
                device="header"
                heading={column.columnDef.meta?.heading?.heading || null}
              />
            ) : (
              formatFilterValue(fMin, columnId, header)
            )}
          </div>
        </div>

        <div className="min-w-0 px-0.5">
          <Slider2
            id={`range-slider_${id}`}
            defaultValue={[minValue, maxValue]}
            value={[fMin, fMax]}
            onValueChange={updateFilter}
            min={minValue}
            max={maxValue}
            className="w-full"
          />
        </div>

        <div className="flex min-w-0 items-center justify-between gap-2">
          <span className="shrink-0 text-xs font-medium text-muted-foreground">Max</span>
          <div className="min-w-0 truncate text-right text-sm font-semibold">
            {hasHeadingMeta ? (
              <RenderTableValue
                value={fMax}
                device="header"
                heading={column.columnDef.meta?.heading?.heading || null}
              />
            ) : (
              formatFilterValue(fMax, columnId, header)
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export const numericRangeFilter: ColumnFiltersColumnDef<TreeMapNode>["filterFn"] = (
  row,
  columnId,
  filterValue,
) => {
  const rowValue = row.getValue(columnId) as number;
  const [min, max] = filterValue;

  if (min !== undefined && rowValue < min) {
    return false;
  }

  if (max !== undefined && rowValue > max) {
    return false;
  }

  return true;
};
