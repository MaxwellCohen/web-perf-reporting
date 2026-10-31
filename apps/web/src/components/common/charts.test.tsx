import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("recharts", () => ({
  PieChart: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Pie: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Label: ({ content }: { content: (props: Record<string, unknown>) => React.ReactNode }) => (
    <div>{content({ cx: 50, cy: 50, innerRadius: 20, outerRadius: 40 })}</div>
  ),
  RadialBarChart: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  RadialBar: ({ dataKey }: { dataKey: string }) => <div>Radial bar: {dataKey}</div>,
}));

vi.mock("@/components/ui/chart", () => ({
  ChartContainer: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  ChartTooltip: () => <div>Chart tooltip</div>,
  ChartTooltipContent: () => <div>Tooltip content</div>,
}));

import {
  GaugeChart,
  HorizontalGaugeChart as HorizontalPageSpeedGaugeChart,
} from "@/components/common/PageSpeedGaugeChart";

const pageLoadMetric = {
  percentile: 1200,
  category: "FAST",
  distributions: [
    { min: 0, max: 1000, proportion: 0.5 },
    { min: 1000, max: 2000, proportion: 0.3 },
    { min: 2000, max: 4000, proportion: 0.2 },
  ],
};

describe("common charts", () => {
  it("renders the main page speed gauge variants when valid metric data is provided", () => {
    const { container } = render(
      <div>
        <GaugeChart metric="FCP" data={pageLoadMetric as any} />
        <HorizontalPageSpeedGaugeChart metric="1200 - FAST" data={pageLoadMetric as any} />
      </div>,
    );

    expect(container.firstChild).toMatchSnapshot();
    expect(container.querySelector('[data-testid="gauge-value-marker"]')).toBeTruthy();
    expect(container.textContent).toContain("1200 - FAST");
  });
});
