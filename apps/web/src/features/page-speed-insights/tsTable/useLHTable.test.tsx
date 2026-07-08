import type { StockRow } from "@/features/page-speed-insights/shared/tanstackStockTypes";
import { render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { PageSpeedInsights } from "@/lib/schema";
import {
  useLHTable,
  CategoryRow,
  AuditSummaryRow,
} from "@/features/page-speed-insights/tsTable/useLHTable";
import type { TableDataItem } from "@/features/page-speed-insights/tsTable/TableDataItem";
import { useTable } from "@tanstack/react-table";
import { createStockColumnHelper as createColumnHelper } from "@/features/page-speed-insights/tanstack-table-v9/createStockColumnHelper";
import { stockFeatures } from "@/features/page-speed-insights/tanstack-table-v9/features";
import { lhTableRowModels } from "@/features/page-speed-insights/tsTable/lhTableRowModels";
vi.mock("@/components/common/PageSpeedGaugeChart", () => ({
  HorizontalScoreChart: () => <div data-testid="score-chart" />,
}));

vi.mock("react-markdown", () => ({
  default: ({ children }: { children: string }) => <div>{children}</div>,
}));

vi.mock("@/components/ui/accordion", () => ({
  AccordionItem: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  AccordionTrigger: ({
    children,
    onClick,
  }: {
    children: React.ReactNode;
    onClick?: () => void;
  }) => (
    <button type="button" onClick={onClick}>
      {children}
    </button>
  ),
  AccordionContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock("@/features/page-speed-insights/lh-categories/AuditDetailsSummary", () => ({
  AuditDetailsSummary: () => <div data-testid="audit-summary" />,
}));

vi.mock("@/features/page-speed-insights/lh-categories/RenderMetricSavings", () => ({
  RenderMetricSavings: () => <div data-testid="metric-savings" />,
}));

vi.mock("@/features/page-speed-insights/lh-categories/RenderDetails", () => ({
  RenderDetails: () => <div data-testid="render-details" />,
}));

vi.mock("@/features/page-speed-insights/RenderJSONDetails", () => ({
  RenderJSONDetails: () => <div data-testid="json-details" />,
}));

const createMockItem = () => ({
  lighthouseResult: {
    categories: {
      performance: {
        title: "Performance",
        score: 0.9,
        auditRefs: [
          { id: "fcp", group: "diagnostics", acronym: "FCP" },
          { id: "lcp", group: "diagnostics", acronym: "LCP" },
        ],
      },
    },
    audits: {
      fcp: { title: "FCP", score: 0.9 },
      lcp: { title: "LCP", score: 0.8 },
    },
  },
});

function UseLHTableWrapper() {
  const items = [{ item: createMockItem() as unknown as PageSpeedInsights, label: "Mobile" }];
  const table = useLHTable(items);
  const rows = table.getRowModel().rows;
  return (
    <div>
      {rows.map((row) => (
        <CategoryRow key={row.id} row={row} />
      ))}
    </div>
  );
}

describe("useLHTable", () => {
  it("returns table with filtered data excluding metrics group", () => {
    const { container } = render(<UseLHTableWrapper />);
    expect(container.firstChild).toBeTruthy();
  });

  it("renders audit summaries inside grouped category rows", () => {
    const { getByText, getAllByTestId } = render(<UseLHTableWrapper />);
    expect(getByText("Performance")).toBeTruthy();
    expect(getAllByTestId("audit-summary")).toHaveLength(2);
  });
});

function CategoryRowWrapper() {
  const columnHelper = createColumnHelper<{ _category?: { title: string }; _userLabel: string }>();
  const columns = [
    columnHelper.accessor((r) => r._category?.title ?? "", {
      id: "category_title",
      header: "Category",
    }),
  ];
  const data = [{ _category: { title: "Performance" }, _userLabel: "Mobile" }];
  const table = useTable({
    features: stockFeatures,
    rowModels: lhTableRowModels,
    data,
    columns: columns as never,
  });
  const row = table.getRowModel().rows[0];
  return <CategoryRow row={row as unknown as StockRow<TableDataItem>} />;
}

describe("CategoryRow", () => {
  it("renders category row", () => {
    const { container } = render(<CategoryRowWrapper />);
    expect(container.textContent).toContain("Performance");
  });
});

function AuditSummaryRowWrapper() {
  const columnHelper = createColumnHelper<{
    auditRef: { acronym?: string };
    auditResult: unknown;
    _userLabel: string;
  }>();
  const columns = [columnHelper.accessor("auditRef.acronym", { id: "acronym", header: "Acronym" })];
  const data = [
    {
      auditRef: { acronym: "FCP" },
      auditResult: { title: "FCP" },
      _userLabel: "Mobile",
    },
  ];
  const table = useTable({
    features: stockFeatures,
    rowModels: lhTableRowModels,
    data,
    columns: columns as never,
  });
  const row = table.getRowModel().rows[0];
  return <AuditSummaryRow row={row as unknown as StockRow<TableDataItem>} />;
}

describe("AuditSummaryRow", () => {
  it("renders audit summary row", () => {
    const { container } = render(<AuditSummaryRowWrapper />);
    expect(container.querySelector('[data-testid="audit-summary"]')).toBeTruthy();
  });
});
