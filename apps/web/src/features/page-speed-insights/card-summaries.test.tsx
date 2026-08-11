import { render } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { NetworkRequestStatsRow } from "@/features/page-speed-insights/network-metrics/useNetworkMetricsData";

const mockUseNetworkRequestStats = vi.hoisted(() => vi.fn());

vi.mock("@/features/page-speed-insights/network-metrics/useNetworkMetricsStore", () => ({
  useNetworkRequestStats: () => mockUseNetworkRequestStats(),
}));

vi.mock("@/features/page-speed-insights/shared/TableCard", () => ({
  TableCard: ({
    title,
    table,
  }: {
    title: string;
    table: { getHeaderGroups: () => unknown[]; getRowModel: () => { rows: unknown[] } };
  }) => (
    <div>
      <h3>{title}</h3>
      <div data-testid="stock-table">
        headers:{table.getHeaderGroups().length} rows:{table.getRowModel().rows.length}
      </div>
    </div>
  ),
}));

vi.mock("@/features/page-speed-insights/lh-categories/table/RenderTableValue", () => ({
  RenderBytesValue: ({ value }: { value: number }) => <span>{value} bytes</span>,
  RenderMSValue: ({ value }: { value: number }) => <span>{Math.round(value)} ms</span>,
}));

import { TaskSummaryCard } from "@/features/page-speed-insights/javascript-metrics/TaskSummaryCard";
import { NetworkRequestsSummaryCard } from "@/features/page-speed-insights/network-metrics/NetworkRequestsSummaryCard";

function summaryRow(
  partial: Pick<
    NetworkRequestStatsRow,
    "label" | "totalRequests" | "totalTransferSize" | "totalResourceSize"
  >,
): NetworkRequestStatsRow {
  return {
    byResourceType: {},
    topResources: [],
    ...partial,
  };
}

describe("page-speed summary cards", () => {
  beforeEach(() => {
    mockUseNetworkRequestStats.mockReset();
  });

  it("renders the network requests summary for one or more reports", () => {
    mockUseNetworkRequestStats.mockReturnValue([
      summaryRow({
        label: "Mobile",
        totalRequests: 2,
        totalTransferSize: 300,
        totalResourceSize: 450,
      }),
      summaryRow({
        label: "Desktop",
        totalRequests: 1,
        totalTransferSize: 150,
        totalResourceSize: 200,
      }),
    ]);
    const { container } = render(<NetworkRequestsSummaryCard />);

    expect(container.textContent).toContain("Network Requests Summary");
    expect(container.querySelector('[data-testid="stock-table"]')).toBeTruthy();
  });

  it("renders task summary fallback calculations from diagnostics and task durations", () => {
    const { container } = render(
      <TaskSummaryCard
        metrics={[
          {
            label: "Mobile",
            diagnostics: [{ numTasks: 3, totalTaskTime: 120, numTasksOver50ms: 1 }],
            mainThreadTasks: [{ duration: 30 }, { duration: 40 }, { duration: 50 }],
          },
          {
            label: "Desktop",
            diagnostics: [],
            mainThreadTasks: [{ duration: 80 }, { duration: 20 }],
          },
        ]}
      />,
    );

    expect(container.textContent).toContain("Task Summary");
    expect(container.querySelector('[data-testid="stock-table"]')).toBeTruthy();
  });
});
