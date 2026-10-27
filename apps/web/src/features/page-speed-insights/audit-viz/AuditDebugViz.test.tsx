import { describe, expect, it, vi } from "vitest";
import { render } from "@testing-library/react";
import type { TableDataItem } from "@/features/page-speed-insights/tsTable/TableDataItem";

vi.mock("@/features/page-speed-insights/MetricValueViz", () => ({
  MetricValueViz: ({ auditId }: { auditId: string }) => (
    <div data-testid="metric-value-viz">{auditId}</div>
  ),
}));

import { AuditDebugViz } from "./AuditDebugViz";

function item(id: string, label: string, numericValue: number): TableDataItem {
  return {
    _userLabel: label,
    auditResult: {
      id,
      title: id,
      score: 1,
      scoreDisplayMode: "numeric",
      numericValue,
      displayValue: String(numericValue),
      details: { type: "debugdata", items: [{ cumulativeLayoutShiftMainFrame: numericValue }] },
    },
    auditRef: { id, weight: 0 },
  } as TableDataItem;
}

describe("AuditDebugViz", () => {
  it("renders MetricValueViz for cumulative-layout-shift", () => {
    const { container } = render(
      <AuditDebugViz
        items={[
          item("cumulative-layout-shift", "Mobile", 0.001),
          item("cumulative-layout-shift", "Desktop", 0.009),
        ]}
      />,
    );

    expect(container.querySelector('[data-testid="metric-value-viz"]')?.textContent).toBe(
      "cumulative-layout-shift",
    );
  });

  it("renders KPI strip for diagnostics", () => {
    const { container } = render(
      <AuditDebugViz
        items={[
          {
            _userLabel: "Mobile",
            auditResult: {
              id: "diagnostics",
              title: "Diagnostics",
              score: null,
              scoreDisplayMode: "informative",
              details: {
                type: "debugdata",
                items: [{ numRequests: 10, totalByteWeight: 2048 }],
              },
            },
            auditRef: { id: "diagnostics", weight: 0 },
          } as TableDataItem,
        ]}
      />,
    );

    expect(container.textContent).toContain("Requests");
    expect(container.textContent).toContain("10");
  });
});
