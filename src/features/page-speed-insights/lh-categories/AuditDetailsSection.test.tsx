import { render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { AuditDetailsSection } from "@/features/page-speed-insights/lh-categories/AuditDetailsSection";
import { isEmptyResult } from "@/features/page-speed-insights/ScoreDisplay";

vi.mock("@/components/ui/accordion", () => ({
  Details: ({ children, id }: { children: React.ReactNode; id?: string }) => (
    <details id={id}>{children}</details>
  ),
}));

vi.mock("@/features/page-speed-insights/RenderJSONDetails", () => ({
  RenderJSONDetails: ({ title }: { title: string }) => (
    <div data-testid="json-details">{title}</div>
  ),
}));

vi.mock("@/features/page-speed-insights/lh-categories/AuditDetailsSummary", () => ({
  AuditDetailsSummary: () => <div data-testid="audit-summary">Summary</div>,
}));

vi.mock("@/features/page-speed-insights/lh-categories/RenderMetricSavings", () => ({
  RenderMetricSavings: () => <div data-testid="metric-savings">Savings</div>,
}));

vi.mock("@/features/page-speed-insights/ScoreDisplay", () => ({
  isEmptyResult: vi.fn(() => false),
}));

describe("AuditDetailsSection", () => {
  it("returns null when auditRef is undefined", () => {
    const { container } = render(<AuditDetailsSection auditsRecords={[{}]} labels={["Mobile"]} />);
    expect(container.firstChild).toBeNull();
  });

  it("returns null when auditRef has no id", () => {
    const { container } = render(
      <AuditDetailsSection auditRef={{} as any} auditsRecords={[{}]} labels={["Mobile"]} />,
    );
    expect(container.firstChild).toBeNull();
  });

  it("renders disabled div when scoreDisplayMode is notApplicable", () => {
    vi.mocked(isEmptyResult).mockReturnValue(false);
    const { container } = render(
      <AuditDetailsSection
        auditRef={{ id: "test-audit", acronym: "T" }}
        auditsRecords={[
          {
            "test-audit": {
              id: "test-audit",
              score: null,
              scoreDisplayMode: "notApplicable",
              title: "Test",
            },
          },
        ]}
        labels={["Mobile"]}
      />,
    );
    expect(container.querySelector('[data-testid="audit-summary"]')).toBeTruthy();
    expect(container.querySelector('[data-testid="json-details"]')).toBeTruthy();
  });

  it("renders Details when not disabled", () => {
    vi.mocked(isEmptyResult).mockReturnValue(false);
    const { container } = render(
      <AuditDetailsSection
        auditRef={{ id: "first-contentful-paint" }}
        auditsRecords={[
          {
            "first-contentful-paint": {
              id: "fcp",
              score: 0.9,
              scoreDisplayMode: "numeric",
              title: "FCP",
            },
          },
        ]}
        labels={["Mobile"]}
      />,
    );
    expect(container.querySelector("details")).toBeTruthy();
    expect(container.querySelector('[data-testid="metric-savings"]')).toBeTruthy();
  });
});
