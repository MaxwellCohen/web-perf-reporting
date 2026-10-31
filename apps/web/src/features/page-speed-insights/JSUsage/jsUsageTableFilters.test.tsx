import { fireEvent, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { StockRow } from "@/features/page-speed-insights/shared/tanstackStockTypes";
import { createStockColumnHelper as createColumnHelper } from "@/features/page-speed-insights/tanstack-table-v9/createStockColumnHelper";
import { useSimpleTable } from "@/features/page-speed-insights/tanstack-table-v9/useSimpleTable";
import { RangeFilterInputs as RangeFilter } from "@/features/page-speed-insights/JSUsage/jsUsageTableFilters";

vi.mock("@/features/page-speed-insights/lh-categories/table/RenderTableValue", () => ({
  RenderBytesValue: ({ value }: { value: number }) => <span data-testid="bytes">{value} B</span>,
  RenderMSValue: ({ value }: { value: number }) => <span data-testid="ms">{value} ms</span>,
  RenderTableValue: ({ value, heading }: { value: number; heading: string | null }) => (
    <span data-testid="table-value">
      {heading ?? ""}: {value}
    </span>
  ),
}));

describe("jsUsageTableFilters", () => {
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
