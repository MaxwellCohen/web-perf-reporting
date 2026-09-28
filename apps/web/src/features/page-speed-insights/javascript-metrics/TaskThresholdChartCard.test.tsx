import { render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/components/ui/chart", () => ({
  ChartContainer: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  ChartTooltip: () => null,
  ChartTooltipContent: () => null,
  ChartLegend: () => <div data-testid="chart-legend" />,
  ChartLegendContent: () => null,
}));

vi.mock("recharts", () => ({
  BarChart: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="bar-chart">{children}</div>
  ),
  Bar: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
  CartesianGrid: () => null,
  LabelList: () => null,
  XAxis: () => null,
  YAxis: () => null,
}));

import { TaskThresholdChartCard } from "@/features/page-speed-insights/javascript-metrics/TaskThresholdChartCard";

const metric = {
  label: "Mobile",
  diagnostics: [{ numTasks: 4, numTasksOver10ms: 3, numTasksOver25ms: 1 }],
  mainThreadTasks: [],
};

describe("TaskThresholdChartCard", () => {
  it("renders a chart for one report", () => {
    const { container, getByText, queryByTestId } = render(
      <TaskThresholdChartCard metrics={[metric]} />,
    );

    expect(container.firstChild).not.toBeNull();
    expect(getByText("Task Duration Thresholds")).toBeInTheDocument();
    expect(queryByTestId("chart-legend")).toBeNull();
  });

  it("renders a legend when comparing reports", () => {
    const { getByTestId } = render(
      <TaskThresholdChartCard
        metrics={[metric, { ...metric, label: "Desktop", diagnostics: [{ numTasks: 2 }] }]}
      />,
    );

    expect(getByTestId("chart-legend")).toBeInTheDocument();
    expect(getByTestId("bar-chart")).toBeInTheDocument();
  });

  it("returns null when there are no tasks", () => {
    const { container } = render(
      <TaskThresholdChartCard
        metrics={[{ label: "Mobile", diagnostics: [], mainThreadTasks: [] }]}
      />,
    );

    expect(container.firstChild).toBeNull();
  });
});
