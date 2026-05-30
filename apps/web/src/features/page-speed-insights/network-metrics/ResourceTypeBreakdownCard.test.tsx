import { render } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { NetworkRequestStatsRow } from "@/features/page-speed-insights/network-metrics/useNetworkMetricsData";

const mockUseNetworkRequestStats = vi.hoisted(() => vi.fn());

vi.mock("@/features/page-speed-insights/network-metrics/useNetworkMetricsStore", () => ({
  useNetworkRequestStats: () => mockUseNetworkRequestStats(),
}));

import { ResourceTypeBreakdownCard } from "@/features/page-speed-insights/network-metrics/ResourceTypeBreakdownCard";

function statsRow(
  partial: Pick<NetworkRequestStatsRow, "label" | "byResourceType"> &
    Partial<
      Pick<
        NetworkRequestStatsRow,
        "totalRequests" | "totalTransferSize" | "totalResourceSize" | "topResources"
      >
    >,
): NetworkRequestStatsRow {
  return {
    totalRequests: 0,
    totalTransferSize: 0,
    totalResourceSize: 0,
    topResources: [],
    ...partial,
  };
}

describe("ResourceTypeBreakdownCard", () => {
  beforeEach(() => {
    mockUseNetworkRequestStats.mockReset();
  });

  it("returns null when stats have no byResourceType", () => {
    mockUseNetworkRequestStats.mockReturnValue([
      statsRow({ label: "Mobile", byResourceType: {} }),
      statsRow({ label: "Desktop", byResourceType: {} }),
    ]);
    const { container } = render(<ResourceTypeBreakdownCard />);
    expect(container.firstChild).toBeNull();
  });

  it("renders when stats have byResourceType data", () => {
    mockUseNetworkRequestStats.mockReturnValue([
      statsRow({
        label: "Mobile",
        byResourceType: {
          script: [{ transferSize: 1000, resourceSize: 2000 }],
        },
      }),
    ]);
    const { container } = render(<ResourceTypeBreakdownCard />);
    expect(container.textContent).toContain("Resource Type Breakdown");
    expect(container.textContent).toContain("Script");
  });
});
