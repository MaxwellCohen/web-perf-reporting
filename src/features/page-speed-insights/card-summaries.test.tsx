import { render } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { NetworkRequestStatsRow } from "@/features/page-speed-insights/network-metrics/useNetworkMetricsData";

const mockUseNetworkRequestStats = vi.hoisted(() => vi.fn());

vi.mock("@/features/page-speed-insights/network-metrics/useNetworkMetricsStore", () => ({
  useNetworkRequestStats: () => mockUseNetworkRequestStats(),
}));

vi.mock("@/components/ui/card", () => ({
  Card: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CardContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CardHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CardTitle: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock("@/components/ui/table", () => ({
  Table: ({ children }: { children: React.ReactNode }) => <table>{children}</table>,
  TableHeader: ({ children }: { children: React.ReactNode }) => <thead>{children}</thead>,
  TableBody: ({ children }: { children: React.ReactNode }) => <tbody>{children}</tbody>,
  TableRow: ({ children }: { children: React.ReactNode }) => <tr>{children}</tr>,
  TableHead: ({ children }: { children: React.ReactNode }) => <th>{children}</th>,
  TableCell: ({ children }: { children: React.ReactNode }) => <td>{children}</td>,
}));

vi.mock("@/features/page-speed-insights/lh-categories/table/RenderTableValue", () => ({
  RenderBytesValue: ({ value }: { value: number }) => <span>{value} bytes</span>,
  RenderMSValue: ({ value }: { value: number }) => <span>{Math.round(value)} ms</span>,
}));

vi.mock("@/features/page-speed-insights/shared/CardWithTable", () => {
  const React = require("react");
  return {
    CardWithTable: ({
      title,
      header,
      children,
    }: {
      title: string;
      header: React.ReactNode;
      children: React.ReactNode;
    }) => (
      <div>
        <h3>{title}</h3>
        <table>
          <thead>{header}</thead>
          <tbody>{children}</tbody>
        </table>
      </div>
    ),
  };
});

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

    expect(container.firstChild).toMatchSnapshot();
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

    expect(container.firstChild).toMatchSnapshot();
  });
});
