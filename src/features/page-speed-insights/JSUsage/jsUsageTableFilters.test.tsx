import { fireEvent, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  getCoreRowModel,
  getFacetedMinMaxValues,
  getFilteredRowModel,
  useReactTable,
  createColumnHelper,
  flexRender,
} from "@tanstack/react-table";
import {
  formatFilterValue,
  RangeFilter,
  useDebouncedCallback,
} from "@/features/page-speed-insights/JSUsage/jsUsageTableFilters";

vi.mock("@/components/ui/slider", () => ({
  Slider2: ({
    value,
    onValueChange,
    min,
    max,
  }: {
    value: number[];
    onValueChange: (v: number[]) => void;
    min: number;
    max: number;
  }) => (
    <input
      data-testid="range-slider"
      type="range"
      min={min}
      max={max}
      value={value[0]}
      onChange={(e) => onValueChange([Number(e.target.value), value[1]])}
    />
  ),
}));

vi.mock("@/features/page-speed-insights/lh-categories/table/RenderTableValue", () => ({
  RenderBytesValue: ({ value }: { value: number }) => <span data-testid="bytes">{value} B</span>,
  RenderMSValue: ({ value }: { value: number }) => <span data-testid="ms">{value} ms</span>,
  RenderTableValue: ({ value, heading }: { value: number; heading: string | null }) => (
    <span data-testid="table-value">
      {heading ?? ""}: {value}
    </span>
  ),
}));

function UseDebouncedCallbackHarness({ delay = 100 }: { delay?: number }) {
  const cb = useDebouncedCallback((x: number) => {
    (window as unknown as { lastArg?: number }).lastArg = x;
  }, delay);
  return <button onClick={() => cb(42)}>Call</button>;
}

describe("jsUsageTableFilters", () => {
  describe("formatFilterValue", () => {
    it("renders bytes for size column", () => {
      const { container } = render(
        <div>{formatFilterValue(1024, "resourceBytes", "Resource Size")}</div>,
      );
      expect(container.querySelector('[data-testid="bytes"]')).toBeTruthy();
    });

    it("renders ms for time column", () => {
      const { container } = render(<div>{formatFilterValue(500, "scripting", "Scripting")}</div>);
      expect(container.querySelector('[data-testid="ms"]')).toBeTruthy();
    });

    it("renders number for other columns", () => {
      const { container } = render(<div>{formatFilterValue(1234, "count", "Count")}</div>);
      expect(container.textContent).toContain("1,234");
    });
  });

  describe("useDebouncedCallback", () => {
    beforeEach(() => vi.useFakeTimers());
    afterEach(() => vi.useRealTimers());

    it("invokes callback after delay", async () => {
      (window as unknown as { lastArg?: number }).lastArg = undefined;
      const { container } = render(<UseDebouncedCallbackHarness delay={100} />);
      fireEvent.click(container.querySelector("button")!);
      expect((window as unknown as { lastArg?: number }).lastArg).toBeUndefined();
      await vi.advanceTimersByTimeAsync(100);
      expect((window as unknown as { lastArg?: number }).lastArg).toBe(42);
    });
  });

  describe("RangeFilter", () => {
    type Row = { id: number; value: number };
    const columnHelper = createColumnHelper<Row>();

    function RangeFilterWrapper() {
      const data = [
        { id: 1, value: 50 },
        { id: 2, value: 100 },
      ];
      const cols = [
        columnHelper.accessor("id", { id: "id" }),
        columnHelper.accessor("value", {
          id: "value",
          header: () => null,
        }),
      ];
      const table = useReactTable({
        data,
        columns: cols,
        getCoreRowModel: getCoreRowModel(),
        getFilteredRowModel: getFilteredRowModel(),
        getFacetedMinMaxValues: getFacetedMinMaxValues(),
        filterFns: { booleanFilterFn: () => true },
      });
      const col = table.getColumn("value");
      if (!col) return null;
      return <RangeFilter column={col} />;
    }

    it("renders range filter with min/max", () => {
      const { container } = render(<RangeFilterWrapper />);
      expect(container.querySelector('[data-testid="range-slider"]')).toBeTruthy();
      expect(container.textContent).toContain("Min");
      expect(container.textContent).toContain("Max");
    });
  });
});
