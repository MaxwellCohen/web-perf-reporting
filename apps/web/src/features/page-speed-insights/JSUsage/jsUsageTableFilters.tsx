/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import type { StockColumnDef, StockHeaderContext } from "@/features/page-speed-insights/shared/tanstackStockTypes";
import type { RowData } from "@tanstack/react-table-v9";
import {
  RenderBytesValue,
  RenderMSValue,
} from "@/features/page-speed-insights/lh-categories/table/RenderTableValue";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import type { TableColumnHeading, TreeMapNode } from "@/lib/schema";
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

  const cancel = useCallback(() => {
    if (timerIdRef.current) {
      clearTimeout(timerIdRef.current);
      timerIdRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => {
      cancel();
    };
  }, [cancel]);

  return Object.assign(debouncedCallback, { cancel });
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

function getRangeInputConfig(columnId: string, header?: string, heading?: TableColumnHeading | null) {
  if (heading?.valueType === "bytes" || BYTES_KEYWORDS.some((k) => `${columnId} ${header ?? ""}`.toLowerCase().includes(k))) {
    return {
      toInputValue: (value: number) => value / 1024,
      fromInputValue: (value: number) => value * 1024,
      suffix: "KB",
      step: 0.01,
    };
  }

  if (heading?.valueType === "ms" || MS_KEYWORDS.some((k) => `${columnId} ${header ?? ""}`.toLowerCase().includes(k))) {
    return {
      toInputValue: (value: number) => value,
      fromInputValue: (value: number) => value,
      suffix: "ms",
      step: 0.01,
    };
  }

  return {
    toInputValue: (value: number) => value,
    fromInputValue: (value: number) => value,
    suffix: undefined,
    step: "any" as const,
  };
}

function clampRange(
  min: number,
  max: number,
  minBound: number,
  maxBound: number,
): [number, number] {
  const clampedMin = Math.max(minBound, Math.min(min, maxBound));
  const clampedMax = Math.min(maxBound, Math.max(max, minBound));
  return [Math.min(clampedMin, clampedMax), Math.max(clampedMin, clampedMax)];
}

type RangeFilterColumn = {
  id: string;
  getFacetedMinMaxValues: () => unknown;
  getFilterValue: () => unknown;
  getIsFiltered?: () => boolean;
  setFilterValue: (value: [number, number] | undefined) => void;
  columnDef: {
    header?: unknown;
    meta?: { heading?: { heading?: TableColumnHeading | null } };
  };
};

export function RangeFilterInputs({ column }: { column: RangeFilterColumn }) {
  const id = useId();
  const [minValue, maxValue] = (column.getFacetedMinMaxValues() as [number, number]) ?? [0, 100];
  const [fMin, fMax] = (column.getFilterValue() as [number, number]) ?? [minValue, maxValue];
  const columnId = column.id;
  const header = typeof column.columnDef.header === "string" ? column.columnDef.header : undefined;
  const heading = column.columnDef.meta?.heading?.heading ?? null;
  const inputConfig = getRangeInputConfig(columnId, header, heading);
  const inputMin = inputConfig.toInputValue(minValue);
  const inputMax = inputConfig.toInputValue(maxValue);
  const displayMin = inputConfig.toInputValue(fMin);
  const displayMax = inputConfig.toInputValue(fMax);
  const [localMin, setLocalMin] = useState<string | number>(() => displayMin);
  const [localMax, setLocalMax] = useState<string | number>(() => displayMax);
  const rangeRef = useRef({ min: fMin, max: fMax });
  rangeRef.current = { min: fMin, max: fMax };

  useEffect(() => {
    setLocalMin(displayMin);
    setLocalMax(displayMax);
  }, [displayMin, displayMax]);

  const updateFilter = useDebouncedCallback((nextMin: number, nextMax: number) => {
    column.setFilterValue(clampRange(nextMin, nextMax, minValue, maxValue));
  }, 300);

  const handleMinChange = (value: string) => {
    setLocalMin(value);
    const parsed = Number(value);
    if (Number.isNaN(parsed)) {
      return;
    }
    updateFilter(inputConfig.fromInputValue(parsed), rangeRef.current.max);
  };

  const handleMaxChange = (value: string) => {
    setLocalMax(value);
    const parsed = Number(value);
    if (Number.isNaN(parsed)) {
      return;
    }
    updateFilter(rangeRef.current.min, inputConfig.fromInputValue(parsed));
  };

  const hasActiveFilter = column.getIsFiltered?.() ?? column.getFilterValue() !== undefined;

  const handleReset = () => {
    updateFilter.cancel();
    column.setFilterValue(undefined);
  };

  return (
    <div className="flex w-full min-w-0 flex-col gap-3">
      <div className="grid grid-cols-2 gap-3">
        <div className="flex min-w-0 flex-col gap-1.5">
          <Label htmlFor={`range-min_${id}`} className="text-xs text-muted-foreground">
            Min{inputConfig.suffix ? ` (${inputConfig.suffix})` : ""}
          </Label>
          <Input
            id={`range-min_${id}`}
            type="number"
            min={inputMin}
            max={inputMax}
            step={inputConfig.step}
            value={localMin}
            onChange={(event) => handleMinChange(event.target.value)}
            className="h-8"
          />
        </div>
        <div className="flex min-w-0 flex-col gap-1.5">
          <Label htmlFor={`range-max_${id}`} className="text-xs text-muted-foreground">
            Max{inputConfig.suffix ? ` (${inputConfig.suffix})` : ""}
          </Label>
          <Input
            id={`range-max_${id}`}
            type="number"
            min={inputMin}
            max={inputMax}
            step={inputConfig.step}
            value={localMax}
            onChange={(event) => handleMaxChange(event.target.value)}
            className="h-8"
          />
        </div>
      </div>
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs text-muted-foreground">
          Available: {formatFilterValue(minValue, columnId, header)} –{" "}
          {formatFilterValue(maxValue, columnId, header)}
        </p>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-7 shrink-0 px-2 text-xs"
          onClick={handleReset}
          disabled={!hasActiveFilter}
          aria-label="Reset range filter"
        >
          Reset
        </Button>
      </div>
    </div>
  );
}

export function RangeFilter<TData extends RowData>({
  column,
}: Pick<StockHeaderContext<TData, unknown>, "column">) {
  return <RangeFilterInputs column={column as RangeFilterColumn} />;
}

export const numericRangeFilter: StockColumnDef<TreeMapNode>["filterFn"] = (
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
