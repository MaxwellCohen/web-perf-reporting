import { render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { Accordion } from "@/components/ui/accordion";
import {
  DetailTable,
  makeColumnDef,
  simpleTableCell,
} from "@/features/page-speed-insights/lh-categories/table/RenderTable";
import type { CellContext } from "@tanstack/react-table";

vi.mock("@/features/page-speed-insights/lh-categories/table/RenderTableValue", () => ({
  RenderTableValue: ({ value }: { value: unknown }) => (
    <span data-testid="table-value">{String(value)}</span>
  ),
}));

vi.mock("@/features/page-speed-insights/tanstack-table-v9/DataTableHeader", () => ({
  DataTableHeader: () => <thead data-testid="data-table-header" />,
}));

vi.mock("@/features/page-speed-insights/tanstack-table-v9/DataTableBody", () => ({
  DataTableBody: () => <tbody data-testid="data-table-body" />,
}));

vi.mock("@/features/page-speed-insights/JSUsage/JSUsageTable", () => ({
  ExpandAll: () => <span data-testid="expand-all" />,
  ExpandRow: () => <span data-testid="expand-row" />,
}));

const createMockRow = (overrides = {}) => ({
  _userLabel: "Mobile",
  auditResult: {
    id: "test-audit",
    details: {
      type: "table",
      headings: [{ key: "name", valueType: "text", label: "Name" }],
      items: [{ name: "Item 1" }],
    },
  },
  ...overrides,
});

describe("DetailTable", () => {
  it("returns null when rows have no detail items", () => {
    const rows = [
      createMockRow({
        auditResult: {
          id: "empty",
          details: { type: "table", headings: [], items: [] },
        },
      }),
    ];
    const { container } = render(<DetailTable rows={rows as any} title="Test" />);
    expect(container.firstChild).toBeNull();
  });

  it("renders table when rows have detail items", () => {
    const rows = [createMockRow()];
    const { container } = render(
      <Accordion type="single" collapsible>
        <DetailTable rows={rows as any} title="Test Table" />
      </Accordion>,
    );
    // DetailTable renders AccordionItem with table inside - table may be in collapsed content
    expect(container.textContent).toContain("Test Table");
  });

  it("combines LCP breakdown rows from each report into one table", () => {
    const rows = ["Mobile", "Desktop"].map((label) =>
      createMockRow({
        _userLabel: label,
        auditResult: {
          id: "lcp-breakdown-insight",
          title: "LCP breakdown",
          details: {
            type: "table",
            headings: [
              { key: "label", valueType: "text", label: "Subpart" },
              { key: "duration", valueType: "ms", label: "Duration" },
            ],
            items: [
              { subpart: "timeToFirstByte", label: "Time to first byte", duration: 100 },
              { subpart: "elementRenderDelay", label: "Element render delay", duration: 400 },
            ],
          },
        },
      }),
    );

    const { container } = render(<DetailTable rows={rows as any} title="LCP breakdown" />);

    expect(container.querySelectorAll("table")).toHaveLength(1);
    expect(container.textContent).not.toContain("Table for Mobile");
    expect(container.textContent).not.toContain("Table for Desktop");
  });

  it("drops the expand column on render-blocking tables and keeps report labels", () => {
    const rows = [
      { label: "Mobile", totalBytes: 7670 },
      { label: "Desktop", totalBytes: 7670 },
    ].map(({ label, totalBytes }) =>
      createMockRow({
        _userLabel: label,
        auditResult: {
          id: "render-blocking-insight",
          title: "Render blocking requests",
          details: {
            type: "table",
            headings: [
              { key: "url", valueType: "url", label: "URL" },
              { key: "totalBytes", valueType: "bytes", label: "Transfer Size" },
              { key: "wastedMs", valueType: "timespanMs", label: "Duration" },
            ],
            items: [
              {
                url: "https://solid-books.vercel.app/assets/app.css",
                totalBytes,
                wastedMs: 150,
              },
            ],
          },
        },
      }),
    );

    const { container } = render(
      <DetailTable rows={rows as any} title="Render blocking requests" />,
    );

    expect(container.querySelector("tbody button")).toBeNull();
    expect(container.textContent).toContain("(Mobile)");
    expect(container.textContent).toContain("(Desktop)");
    expect(container.textContent).toContain("https://solid-books.vercel.app/assets/app.css");
  });

  it("drops the expand column on bootup-time tables and keeps the metric columns", () => {
    const rows = [
      { label: "Mobile", total: 187, scripting: 172, scriptParseCompile: 8 },
      { label: "Desktop", total: 161, scripting: 149, scriptParseCompile: 4 },
    ].map(({ label, total, scripting, scriptParseCompile }) =>
      createMockRow({
        _userLabel: label,
        auditResult: {
          id: "bootup-time",
          title: "JavaScript execution time",
          details: {
            type: "table",
            headings: [
              { key: "url", valueType: "url", label: "URL" },
              { key: "total", valueType: "ms", label: "Total CPU Time" },
              { key: "scripting", valueType: "ms", label: "Script Evaluation" },
              { key: "scriptParseCompile", valueType: "ms", label: "Script Parse" },
            ],
            items: [
              {
                url: "https://solid-books.vercel.app/assets/book-utils.js",
                total,
                scripting,
                scriptParseCompile,
              },
            ],
          },
        },
      }),
    );

    const { container } = render(
      <DetailTable rows={rows as any} title="JavaScript execution time" />,
    );

    expect(container.querySelector("tbody button")).toBeNull();
    expect(container.textContent).toContain("book-utils.js");
    expect(container.textContent).toContain("187");
    expect(container.textContent).toContain("172");
    expect(container.textContent).toContain("8");
    expect(container.textContent).toContain("(Mobile)");
    expect(container.textContent).toContain("(Desktop)");
  });

});

describe("makeColumnDef", () => {
  it("returns column definitions for heading", () => {
    const defs = makeColumnDef(
      {
        heading: { key: "size", valueType: "bytes", label: "Size" },
        _userLabel: "",
      },
      { showUserLabel: false },
    );
    expect(defs.length).toBeGreaterThan(0);
    expect(defs[0].id).toContain("size");
  });

  it("returns empty array for heading without key", () => {
    const defs = makeColumnDef(
      { heading: { key: "", label: "", valueType: "text" }, _userLabel: "" },
      { showUserLabel: false },
    );
    expect(defs).toEqual([]);
  });
});

describe("simpleTableCell", () => {
  it("renders value via RenderTableValue for non-array", () => {
    const mockCell = {
      getValue: () => "test",
      column: { columnDef: { meta: { heading: { heading: { valueType: "text" } } } } },
      row: { original: { _userLabel: "" } },
    } as never;
    const result = simpleTableCell(mockCell);
    expect(result).toBeTruthy();
  });
});
