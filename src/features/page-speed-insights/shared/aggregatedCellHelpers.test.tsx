import { render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import {
  extractValueLabelPairs,
  createNumericAggregatedCell,
  createStringAggregatedCell,
  createBytesAggregatedCell,
  createReportLabelAggregatedCell,
} from "./aggregatedCellHelpers";

vi.mock("@/features/page-speed-insights/lh-categories/table/RenderTableValue", () => ({
  RenderMSValue: ({ value }: { value: number }) => <span>{value} ms</span>,
  RenderBytesValue: ({ value }: { value: number }) => <span>{value} B</span>,
}));

function createMockRow(leafRows: { columnValues: Record<string, unknown>; label?: string }[]) {
  return {
    getLeafRows: () =>
      leafRows.map((r) => ({
        getValue: (col: string) => (col === "label" ? r.label : r.columnValues[col]),
        original: { label: r.label },
      })),
  };
}

describe("aggregatedCellHelpers", () => {
  describe("extractValueLabelPairs", () => {
    it("filters out undefined and null values", () => {
      const row = createMockRow([
        { columnValues: { duration: 100 }, label: "Mobile" },
        { columnValues: { duration: undefined }, label: "Desktop" },
        { columnValues: { duration: null }, label: "Tablet" },
      ]) as any;
      const result = extractValueLabelPairs<number>(row, "duration");
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({ value: 100, label: "Mobile" });
    });

    it("filters out NaN values", () => {
      const row = createMockRow([{ columnValues: { duration: NaN }, label: "Mobile" }]) as any;
      const result = extractValueLabelPairs<number>(row, "duration");
      expect(result).toHaveLength(0);
    });
  });

  describe("createNumericAggregatedCell", () => {
    it("returns N/A when no value pairs", () => {
      const row = createMockRow([{ columnValues: { duration: undefined } }]) as any;
      const cell = createNumericAggregatedCell("duration");
      const result = cell({ row } as any);
      expect(result).toBe("N/A");
    });

    it("renders single value with label", () => {
      const row = createMockRow([{ columnValues: { duration: 150 }, label: "Mobile" }]) as any;
      const cell = createNumericAggregatedCell("duration");
      const { container } = render(<>{cell({ row } as any)}</>);
      expect(container.textContent).toContain("150");
      expect(container.textContent).toContain("Mobile");
    });
  });

  describe("createStringAggregatedCell", () => {
    it("returns N/A when no value pairs", () => {
      const row = createMockRow([{ columnValues: { url: undefined } }]) as any;
      const cell = createStringAggregatedCell("url");
      const result = cell({ row } as any);
      expect(result).toBe("N/A");
    });

    it("renders single value without label when showAllDevicesLabel false", () => {
      const row = createMockRow([
        { columnValues: { url: "https://a.com" }, label: "Mobile" },
        { columnValues: { url: "https://a.com" }, label: "Desktop" },
      ]) as any;
      const cell = createStringAggregatedCell("url", undefined, false);
      const { container } = render(<>{cell({ row } as any)}</>);
      expect(container.textContent).toContain("https://a.com");
    });
  });

  describe("createBytesAggregatedCell", () => {
    it("returns cell renderer", () => {
      const cell = createBytesAggregatedCell("bytes");
      expect(typeof cell).toBe("function");
    });
  });

  describe("createReportLabelAggregatedCell", () => {
    it("returns N/A when no values", () => {
      const row = createMockRow([{ columnValues: { label: undefined } }]) as any;
      const cell = createReportLabelAggregatedCell("label");
      const result = cell({ row } as any);
      expect(result).toBe("N/A");
    });

    it("renders single unique value", () => {
      const row = createMockRow([{ columnValues: { label: "Mobile" }, label: "Mobile" }]) as any;
      const cell = createReportLabelAggregatedCell("label");
      const { container } = render(<>{cell({ row } as any)}</>);
      expect(container.textContent).toContain("Mobile");
    });
  });
});
