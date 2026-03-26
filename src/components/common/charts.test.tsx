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
  FormFactorPercentPieChart,
  PercentTable,
  toSentenceCase,
} from "@/components/common/FormFactorPercentPieChart";
import Gauge, {
  GaugeChart,
  HorizontalGaugeChart as HorizontalPageSpeedGaugeChart,
  LineChart,
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
  it("converts snake case labels into sentence case", () => {
    expect(toSentenceCase("largest_contentful_paint")).toBe("Largest contentful paint");
    expect(toSentenceCase("")).toBe("");
  });

  it("renders the radial form factor chart and percent table", () => {
    const { container } = render(
      <div>
        <FormFactorPercentPieChart
          title="Form Factors"
          form_factors={{ desktop: 0.5, phone: 0.3, tablet: 0.2 }}
        />
        <PercentTable
          title="Navigation Types"
          data={{ navigate: 0.7, reload: 0.3 }}
          dateRange="Jan 1 - Jan 31"
        />
      </div>,
    );

    expect(container.firstChild).toMatchSnapshot();
  });

  it("renders the main page speed gauge variants when valid metric data is provided", () => {
    const { container } = render(
      <div>
        <Gauge metric="FCP" data={pageLoadMetric as any} />
        <HorizontalPageSpeedGaugeChart metric="1200 - FAST" data={pageLoadMetric as any} />
      </div>,
    );

    expect(container.firstChild).toMatchSnapshot();
    expect(document.querySelectorAll("path, circle, text").length).toBeGreaterThan(0);
  });

  it("renders nothing for invalid gauge data and draws the fallback line chart", () => {
    const { container } = render(
      <div>
        <GaugeChart metric="LCP" data={undefined as any} />
        <HorizontalPageSpeedGaugeChart metric="CLS" data={undefined as any} />
        <LineChart
          chartData={[
            { name: "Good", value: 100, fill: "#0f0" },
            { name: "NI", value: 200, fill: "#ff0" },
            { name: "Poor", value: 300, fill: "#f00" },
          ]}
          value={300}
        />
      </div>,
    );

    expect(container.querySelectorAll("svg")).toHaveLength(1);
    expect(container.textContent).not.toContain("LCP");
    expect(container.textContent).not.toContain("CLS");
  });

  it("exports the default gauge component", () => {
    expect(Gauge).toBe(GaugeChart);
  });
});
