import { fireEvent, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { StockFilterFn, StockRow } from "@/features/page-speed-insights/shared/tanstackStockTypes";
import { createStockColumnHelper as createColumnHelper } from "@/features/page-speed-insights/tanstack-table-v9/createStockColumnHelper";
import { useSimpleTable } from "@/features/page-speed-insights/tanstack-table-v9/useSimpleTable";
import {
  formatFilterValue,
  RangeFilter,
  useDebouncedCallback,
  numericRangeFilter,
} from "@/features/page-speed-insights/JSUsage/jsUsageTableFilters";


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
  describe("numericRangeFilter", () => {
    const noopAddMeta = () => {};
    const getRow = (value: number) =>
      ({ getValue: () => value }) as unknown as StockRow<{ x: number }>;
    const filter = numericRangeFilter as unknown as StockFilterFn;

    it("returns true when value is within [min, max]", () => {
      expect(filter(getRow(50) as never, "x", [0, 100], noopAddMeta)).toBe(true);
      expect(filter(getRow(0) as never, "x", [0, 100], noopAddMeta)).toBe(true);
      expect(filter(getRow(100) as never, "x", [0, 100], noopAddMeta)).toBe(true);
    });

    it("returns false when value is below min", () => {
      expect(filter(getRow(10) as never, "x", [20, 100], noopAddMeta)).toBe(false);
    });

    it("returns false when value is above max", () => {
      expect(filter(getRow(150) as never, "x", [0, 100], noopAddMeta)).toBe(false);
    });

    it("handles undefined min (only max check)", () => {
      expect(filter(getRow(50) as never, "x", [undefined, 100], noopAddMeta)).toBe(true);
      expect(filter(getRow(150) as never, "x", [undefined, 100], noopAddMeta)).toBe(false);
    });

    it("handles undefined max (only min check)", () => {
      expect(filter(getRow(50) as never, "x", [0, undefined], noopAddMeta)).toBe(true);
      expect(filter(getRow(0) as never, "x", [10, undefined], noopAddMeta)).toBe(false);
    });
  });

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
          filterFn: "inNumberRange",
        }),
      ];
      const table = useSimpleTable({ data, columns: cols as never });
      const col = table.getColumn("value");
      if (!col) return null;
      return (
        <>
          <RangeFilter column={col} />
          <span data-testid="filter-value">{JSON.stringify(col.getFilterValue() ?? null)}</span>
        </>
      );
    }

    it("renders range filter with min/max inputs", () => {
      const { getByLabelText, getByRole, container } = render(<RangeFilterWrapper />);
      expect(getByLabelText("Min")).toBeTruthy();
      expect(getByLabelText("Max")).toBeTruthy();
      expect(getByRole("button", { name: "Reset range filter" })).toBeTruthy();
      expect(container.textContent).toContain("Available:");
    });

    it("reset clears an active range filter", async () => {
      vi.useFakeTimers();
      const { getByLabelText, getByRole, getByTestId } = render(<RangeFilterWrapper />);

      fireEvent.change(getByLabelText("Min"), { target: { value: "75" } });
      await vi.advanceTimersByTimeAsync(300);
      expect(getByTestId("filter-value").textContent).not.toBe("null");

      fireEvent.click(getByRole("button", { name: "Reset range filter" }));
      await vi.advanceTimersByTimeAsync(300);
      expect(getByTestId("filter-value").textContent).toBe("null");

      vi.useRealTimers();
    });
  });
});
