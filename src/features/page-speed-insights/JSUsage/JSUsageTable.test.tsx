import { render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import {
  ExpandAll,
  useUseJSUsageTable,
  JSUsageTableWithControls,
} from "@/features/page-speed-insights/JSUsage/JSUsageTable";

type MockRow = {
  name: string;
  resourceBytes: number;
  unusedBytes?: number;
  children: { name: string; resourceBytes: number; unusedBytes?: number }[];
};

vi.mock("@/features/page-speed-insights/JSUsage/jsUsageTableColumns", () => ({
  columns: [
    { id: "expander", header: () => null, cell: () => null, size: 40 },
    {
      accessorKey: "name",
      id: "name",
      header: () => "Name",
      cell: (c: { getValue: () => unknown }) => String(c.getValue()),
      size: 200,
    },
    {
      id: "host",
      accessorFn: (row: MockRow) => {
        try {
          return new URL(row.name).hostname;
        } catch {
          return "";
        }
      },
      header: () => "Host",
      enableGrouping: true,
      size: 100,
    },
  ],
  makeSortingHeading: () => () => null,
}));

vi.mock("@/features/page-speed-insights/JSUsage/jsUsageTableRow", () => ({
  JSUsageTableRow: () => (
    <tr data-testid="mock-usage-row">
      <td />
    </tr>
  ),
}));

vi.mock("@/features/page-speed-insights/JSUsage/jsUsageTableHeader", () => ({
  JSUsageTableHeader: () => (
    <tr data-testid="mock-usage-header">
      <th />
    </tr>
  ),
}));

vi.mock("@/components/ui/button", () => ({
  Button: ({
    children,
    ...rest
  }: React.PropsWithChildren<Record<string, unknown>>) => (
    <button type="button" {...rest}>{children}</button>
  ),
}));

vi.mock("@/components/ui/table", () => ({
  Table: ({ children }: { children: React.ReactNode }) => <table>{children}</table>,
  TableHeader: ({ children }: { children: React.ReactNode }) => <thead>{children}</thead>,
  TableBody: ({ children }: { children: React.ReactNode }) => <tbody>{children}</tbody>,
  TableRow: ({ children }: { children: React.ReactNode }) => <tr>{children}</tr>,
  TableHead: ({ children }: { children: React.ReactNode }) => <th>{children}</th>,
  TableCell: ({ children }: { children: React.ReactNode }) => <td>{children}</td>,
}));

vi.mock("@/features/page-speed-insights/JSUsage/TableControls", () => ({
  TableControls: () => <div data-testid="table-controls">TableControls</div>,
}));

vi.mock("lucide-react", () => ({
  ArrowUp: () => <span data-testid="arrow-up" />,
  MinusIcon: () => <span data-testid="minus" />,
  ChevronRightIcon: () => <span data-testid="chevron-right" />,
  ChevronDown: () => <span data-testid="chevron-down" />,
  ChevronUp: () => <span data-testid="chevron-up" />,
}));

const mockTreeNodes: MockRow[] = [
  {
    name: "https://example.com/script.js",
    resourceBytes: 50000,
    unusedBytes: 10000,
    children: [],
  },
];

function JSUsageTableWrapper({ data }: { data: MockRow[] }) {
  const table = useUseJSUsageTable(data);
  return <div data-testid="table">{table.getRowModel().rows.length} rows</div>;
}

describe("JSUsageTable", () => {
  describe("ExpandAll", () => {
    function ExpandAllWrapper() {
      const table = useUseJSUsageTable(mockTreeNodes);
      return <ExpandAll table={table} />;
    }
    it("renders expand/collapse button", () => {
      const { container } = render(<ExpandAllWrapper />);
      expect(container.querySelector("button")).toBeTruthy();
      expect(container.querySelector("button")?.getAttribute("aria-label")).toMatch(
        /Expand all|Collapse all/,
      );
    });
  });

  describe("useUseJSUsageTable", () => {
    it("returns table with rows from data", () => {
      const { container } = render(<JSUsageTableWrapper data={mockTreeNodes} />);
      expect(container.querySelector('[data-testid="table"]')?.textContent).toBe("1 rows");
    });

    it("returns table with 0 rows for empty data", () => {
      const { container } = render(<JSUsageTableWrapper data={[]} />);
      expect(container.querySelector('[data-testid="table"]')?.textContent).toBe("0 rows");
    });
  });

  describe("JSUsageTableWithControls", () => {
    it("renders table with rows when data provided", () => {
      const { container } = render(<JSUsageTableWithControls data={mockTreeNodes} />);
      expect(container.querySelector("table")).toBeTruthy();
      expect(container.textContent).not.toContain("No results.");
    });

    it("renders NoResultsRow when data is empty", () => {
      const { container } = render(<JSUsageTableWithControls data={[]} />);
      expect(container.textContent).toContain("No results.");
    });

    it("renders TableControls when depth is 0", () => {
      const { container } = render(<JSUsageTableWithControls data={mockTreeNodes} />);
      expect(container.querySelector('[data-testid="table-controls"]')).toBeTruthy();
    });

    it("renders without TableControls when depth > 0", () => {
      const { container } = render(<JSUsageTableWithControls data={mockTreeNodes} depth={1} />);
      expect(container.querySelector('[data-testid="table-controls"]')).toBeNull();
    });
  });
});
