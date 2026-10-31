import type { StockRow } from "@/features/page-speed-insights/shared/tanstackStockTypes";
import { render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { PageSpeedInsights } from "@/lib/schema";
import { useLHTable, CategoryRow } from "@/features/page-speed-insights/tsTable/useLHTable";
import type { TableDataItem } from "@/features/page-speed-insights/tsTable/TableDataItem";
import { useTable } from "@tanstack/react-table";
import { createStockColumnHelper as createColumnHelper } from "@/features/page-speed-insights/tanstack-table-v9/createStockColumnHelper";
import { lhTableFeatures } from "@/features/page-speed-insights/tanstack-table-v9/features";
vi.mock("@/components/common/PageSpeedGaugeChart", () => ({
  HorizontalScoreChart: () => <div data-testid="score-chart" />,
}));

vi.mock("react-markdown", () => ({
  default: ({ children }: { children: string }) => <div>{children}</div>,
}));

vi.mock("@/components/ui/accordion", () => ({
  Accordion: ({
    children,
    defaultValue,
  }: {
    children: React.ReactNode;
    defaultValue?: string[];
  }) => <div data-default-open={defaultValue?.join("|")}>{children}</div>,
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
    features: lhTableFeatures,
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

describe("CategoryRow status sections", () => {
  function Wrapper({ labels, expandAll }: { labels: string[]; expandAll?: boolean }) {
    const mk = (scores: Record<string, number>) =>
      ({
        lighthouseResult: {
          categories: {
            performance: {
              title: "Performance",
              score: 0.5,
              auditRefs: Object.keys(scores).map((id) => ({ id, group: "diagnostics" })),
            },
          },
          audits: Object.fromEntries(
            Object.entries(scores).map(([id, score]) => [
              id,
              { id, title: id, score, scoreDisplayMode: "numeric" },
            ]),
          ),
        },
      }) as unknown as PageSpeedInsights;
    const items = [
      { item: mk({ good: 1, bad: 0.1, mid: 0.7 }), label: labels[0] },
      ...(labels[1] ? [{ item: mk({ good: 1, bad: 1, mid: 0.7 }), label: labels[1] }] : []),
    ];
    const table = useLHTable(items);
    return (
      <div>
        {table.getRowModel().rows.map((row) => (
          <CategoryRow key={row.id} row={row} expandAll={expandAll} />
        ))}
      </div>
    );
  }

  it("groups audits by status with a summary (single report)", () => {
    const { getByTestId, container } = render(<Wrapper labels={["Mobile"]} />);
    expect(getByTestId("audit-section-fail").hasAttribute("open")).toBe(true);
    expect(getByTestId("audit-section-average").hasAttribute("open")).toBe(true);
    expect(getByTestId("audit-section-pass").hasAttribute("open")).toBe(false);
    expect(container.textContent).toContain("1 failed · 1 needs attention · 1 passed");
  });

  it("uses the worst status across two reports", () => {
    const { getByTestId, container } = render(<Wrapper labels={["Mobile", "Desktop"]} />);
    expect(
      getByTestId("audit-section-fail").querySelectorAll('[data-testid="audit-summary"]'),
    ).toHaveLength(1);
    expect(container.textContent).toContain("1 failed · 1 needs attention · 1 passed");
  });

  it.each([[["Mobile"]], [["Mobile", "Desktop"]]])(
    "expandAll opens every section and audit row (%j)",
    (labels) => {
      const { getByTestId, container } = render(<Wrapper labels={labels} expandAll />);
      for (const status of ["fail", "average", "pass"]) {
        const section = getByTestId(`audit-section-${status}`);
        expect(section.hasAttribute("open")).toBe(true);
        // Each section's audit accordion starts with all of its audits open.
        const auditList = section.querySelector("[data-default-open]");
        expect(auditList?.getAttribute("data-default-open")).toBeTruthy();
      }
      expect(container.textContent).toContain("1 failed · 1 needs attention · 1 passed");
    },
  );

  it("keeps audit rows closed by default", () => {
    const { getByTestId } = render(<Wrapper labels={["Mobile"]} />);
    const auditList = getByTestId("audit-section-fail").querySelector("[data-default-open]");
    expect(auditList?.getAttribute("data-default-open")).toBe("");
  });
});
