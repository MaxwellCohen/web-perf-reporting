import { render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { createColumnHelper } from "@tanstack/react-table";
import { RenderMSValue } from "@/features/page-speed-insights/lh-categories/table/RenderTableValue";
import {
  createBytesColumn,
  createMSColumn,
  createPercentageColumn,
  createReportColumn,
  createTruncatedTextColumn,
  createURLColumn,
  metricTableEmptyDisplay,
  METRIC_TABLE_EMPTY_DISPLAY,
  createOptionalNumericCell,
} from "@/features/page-speed-insights/shared/tableColumnHelpers";

vi.mock("@/features/page-speed-insights/lh-categories/table/RenderTableValue", () => ({
  RenderBytesValue: ({ value }: { value: number }) => <span>{value} B</span>,
  RenderMSValue: ({ value }: { value: number }) => <span>{value} ms</span>,
}));

vi.mock("@/features/page-speed-insights/shared/aggregatedCellHelpers", () => ({
  createBytesAggregatedCell: () => () => null,
  createStringAggregatedCell: () => () => null,
  createReportLabelAggregatedCell: () => () => null,
  createNumericAggregatedCell: () => () => null,
  createPercentageAggregatedCell: () => () => null,
}));

type Row = {
  url: string;
  label: string;
  bytes?: number;
  origin?: string;
  ms?: number;
  pct?: number;
};

describe("tableColumnHelpers", () => {
  describe("createURLColumn", () => {
    it("returns column with url accessor and header", () => {
      const helper = createColumnHelper<Row>();
      const col = createURLColumn(helper);
      expect(col.id).toBe("url");
      expect(col.header).toBe("URL");
    });

    it("uses custom maxWidth when provided", () => {
      const helper = createColumnHelper<Row>();
      const col = createURLColumn(helper, "max-w-50");
      const cell = (col.cell as Function)({
        getValue: () => "https://example.com",
      } as any);
      const { container } = render(<>{cell}</>);
      expect(container.firstChild).toHaveClass("max-w-50");
    });
  });

  describe("createBytesColumn", () => {
    it("returns column with accessor and header", () => {
      const helper = createColumnHelper<Row>();
      const col = createBytesColumn(helper, "bytes", "Bytes");
      expect(col.id).toBe("bytes");
      expect(col.header).toBe("Bytes");
    });

    it("renders N/A when value is undefined", () => {
      const helper = createColumnHelper<Row>();
      const col = createBytesColumn(helper, "bytes", "Bytes");
      const cell = (col.cell as Function)({ getValue: () => undefined } as any);
      expect(cell).toBe("N/A");
    });

    it("renders RenderBytesValue when value is defined", () => {
      const helper = createColumnHelper<Row>();
      const col = createBytesColumn(helper, "bytes", "Bytes");
      const cell = (col.cell as Function)({ getValue: () => 1024 } as any);
      const { container } = render(<>{cell}</>);
      expect(container.textContent).toContain("1024");
    });
  });

  describe("createReportColumn", () => {
    it("returns column with label accessor", () => {
      const helper = createColumnHelper<Row>();
      const col = createReportColumn(helper);
      expect(col.id).toBe("label");
      expect(col.header).toBe("Report");
    });
  });

  describe("metricTableEmptyDisplay", () => {
    it("matches constant", () => {
      expect(metricTableEmptyDisplay()).toBe(METRIC_TABLE_EMPTY_DISPLAY);
    });
  });

  describe("createOptionalNumericCell", () => {
    it("renders N/A when undefined", () => {
      const cell = createOptionalNumericCell(RenderMSValue, undefined);
      expect(cell).toBe(METRIC_TABLE_EMPTY_DISPLAY);
    });
  });

  describe("createTruncatedTextColumn", () => {
    it("renders truncated div with title", () => {
      type OriginRow = { label: string; origin: string };
      const helper = createColumnHelper<OriginRow>();
      const col = createTruncatedTextColumn(helper, {
        accessor: "origin",
        id: "origin",
        header: "Origin",
        maxWidthClass: "max-w-50",
      });
      expect(col.id).toBe("origin");
      const cell = (col.cell as (a: { getValue: () => string }) => unknown)({
        getValue: () => "example.com",
      });
      const { container } = render(<>{cell}</>);
      const el = container.firstChild as HTMLElement;
      expect(el).toHaveClass("truncate", "max-w-50");
      expect(el).toHaveAttribute("title", "example.com");
    });
  });

  describe("createMSColumn", () => {
    it("renders N/A when value undefined", () => {
      const helper = createColumnHelper<{ label: string; ms?: number }>();
      const col = createMSColumn(helper, "ms", "Time");
      const cell = (col.cell as Function)({ getValue: () => undefined } as any);
      expect(cell).toBe("N/A");
    });

    it("renders RenderMSValue when defined", () => {
      const helper = createColumnHelper<{ label: string; ms?: number }>();
      const col = createMSColumn(helper, "ms", "Time");
      const cell = (col.cell as Function)({ getValue: () => 12 } as any);
      const { container } = render(<>{cell}</>);
      expect(container.textContent).toContain("12");
    });
  });

  describe("createPercentageColumn", () => {
    it("formats percent with precision", () => {
      const helper = createColumnHelper<{ label: string; pct?: number }>();
      const col = createPercentageColumn(helper, "pct", "Wasted %", 1);
      const cell = (col.cell as Function)({ getValue: () => 3.456 } as any);
      expect(cell).toBe("3.5%");
    });

    it("renders empty display when undefined", () => {
      const helper = createColumnHelper<{ label: string; pct?: number }>();
      const col = createPercentageColumn(helper, "pct", "Wasted %");
      const cell = (col.cell as Function)({ getValue: () => undefined } as any);
      expect(cell).toBe(METRIC_TABLE_EMPTY_DISPLAY);
    });
  });
});
