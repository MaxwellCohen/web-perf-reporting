import { render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("recharts", () => ({
  PieChart: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="pie-chart">{children}</div>
  ),
  Pie: ({ children }: { children: React.ReactNode }) => <div data-testid="pie">{children}</div>,
  Label: ({
    content,
  }: {
    content: (props: {
      viewBox?: { cx: number; cy: number; innerRadius?: number; outerRadius?: number };
    }) => React.ReactNode;
  }) => {
    const result = content({
      viewBox: { cx: 50, cy: 50, innerRadius: 20, outerRadius: 40 },
    });
    return <div data-testid="label">{result}</div>;
  },
}));

vi.mock("@/components/ui/chart", () => ({
  ChartContainer: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="chart-container">{children}</div>
  ),
}));

import {
  GaugeChart,
  HorizontalGaugeChart,
  HorizontalScoreChart,
  LineChart,
} from "@/components/common/PageSpeedGaugeChart";

const validMetricData = {
  percentile: 1200,
  category: "FAST",
  distributions: [
    { min: 0, max: 1000, proportion: 0.5 },
    { min: 1000, max: 2000, proportion: 0.3 },
    { min: 2000, max: 4000, proportion: 0.2 },
  ],
};

describe("GaugeChart", () => {
  it("returns null when data is undefined", () => {
    const { container } = render(<GaugeChart metric="FCP" data={undefined} />);
    expect(container.firstChild).toBeNull();
  });

  it("returns null when distributions length is not 3", () => {
    const { container } = render(
      <GaugeChart
        metric="FCP"
        data={
          {
            ...validMetricData,
            distributions: [{ min: 0, max: 1000, proportion: 1 }],
          } as any
        }
      />,
    );
    expect(container.firstChild).toBeNull();
  });

  it("renders chart with valid data and metric", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const { container } = render(
      <GaugeChart metric="First Contentful Paint" data={validMetricData as any} />,
    );
    expect(container.querySelector('[data-testid="chart-container"]')).toBeTruthy();
    expect(container.querySelector('[data-testid="pie-chart"]')).toBeTruthy();
    expect(container.textContent).toContain("1,200");
    expect(container.textContent).toContain("First Contentful Paint");
    vi.restoreAllMocks();
  });

  it("renders chart without metric label when metric is empty", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const { container } = render(<GaugeChart metric="" data={validMetricData as any} />);
    expect(container.textContent).toContain("1,200");
    expect(container.textContent).toContain("FAST");
    vi.restoreAllMocks();
  });
});

describe("HorizontalGaugeChart", () => {
  it("returns null when data is undefined", () => {
    const { container } = render(<HorizontalGaugeChart data={undefined} />);
    expect(container.firstChild).toBeNull();
  });

  it("returns null when distributions length is not 3", () => {
    const { container } = render(
      <HorizontalGaugeChart
        data={
          {
            ...validMetricData,
            distributions: [],
          } as any
        }
      />,
    );
    expect(container.firstChild).toBeNull();
  });

  it("renders with valid data and metric", () => {
    const { container } = render(
      <HorizontalGaugeChart metric="LCP" data={validMetricData as any} />,
    );
    expect(container.querySelector("svg")).toBeTruthy();
    expect(container.textContent).toContain("LCP");
  });

  it("renders without metric when metric is undefined", () => {
    const { container } = render(<HorizontalGaugeChart data={validMetricData as any} />);
    expect(container.querySelector("svg")).toBeTruthy();
  });

  it("handles distributions with optional max/min", () => {
    const dataWithOptional = {
      percentile: 500,
      category: "AVG",
      distributions: [
        { min: 0, max: 400, proportion: 0.5 },
        { min: 400, proportion: 0.3 },
        { min: 800, max: 1200, proportion: 0.2 },
      ],
    };
    const { container } = render(
      <HorizontalGaugeChart metric="Test" data={dataWithOptional as any} />,
    );
    expect(container.querySelector("svg")).toBeTruthy();
  });
});

describe("LineChart", () => {
  const baseChartData = [
    { name: "Good", value: 100, fill: "#0f0" },
    { name: "NI", value: 200, fill: "#ff0" },
    { name: "Poor", value: 300, fill: "#f00" },
  ];

  it("renders SVG with segments", () => {
    const { container } = render(<LineChart chartData={baseChartData as any} value={150} />);
    expect(container.querySelector("svg")).toBeTruthy();
    expect(container.querySelectorAll("rect").length).toBeGreaterThanOrEqual(4);
  });

  it("renders when value equals maxValue", () => {
    const { container } = render(<LineChart chartData={baseChartData as any} value={600} />);
    expect(container.querySelector("svg")).toBeTruthy();
  });

  it("renders when value is 0", () => {
    const { container } = render(<LineChart chartData={baseChartData as any} value={0} />);
    expect(container.querySelector("svg")).toBeTruthy();
  });

  it("formats small values correctly when value <= 1", () => {
    const smallData = [
      { name: "Good", value: 0.5, fill: "#0f0" },
      { name: "NI", value: 0.3, fill: "#ff0" },
      { name: "Poor", value: 0.2, fill: "#f00" },
    ];
    const { container } = render(<LineChart chartData={smallData as any} value={0.5} />);
    expect(container.querySelector("svg")).toBeTruthy();
    expect(container.textContent).toContain("0.5");
  });

  it("formats values with toFixed when value > 1", () => {
    const { container } = render(<LineChart chartData={baseChartData as any} value={200} />);
    expect(container.textContent).toContain("100");
    expect(container.textContent).toContain("200");
  });

  it("renders indicator with width 4 when value equals maxValue", () => {
    const { container } = render(<LineChart chartData={baseChartData as any} value={300} />);
    const rects = container.querySelectorAll("rect");
    const indicatorRect = Array.from(rects).find((r) =>
      r.getAttribute("class")?.includes("rounded-l-full"),
    );
    expect(indicatorRect?.getAttribute("width")).toBe("4");
  });

  it("renders indicator with width 4 when value is 0", () => {
    const { container } = render(<LineChart chartData={baseChartData as any} value={0} />);
    const rects = container.querySelectorAll("rect");
    const indicatorRect = Array.from(rects).find((r) =>
      r.getAttribute("class")?.includes("rounded-l-full"),
    );
    expect(indicatorRect?.getAttribute("width")).toBe("4");
  });

  it("renders indicator with width 2 when value is between 0 and max", () => {
    const { container } = render(<LineChart chartData={baseChartData as any} value={150} />);
    const rects = container.querySelectorAll("rect");
    const indicatorRect = Array.from(rects).find((r) =>
      r.getAttribute("class")?.includes("rounded-l-full"),
    );
    expect(indicatorRect?.getAttribute("width")).toBe("2");
  });
});

describe("HorizontalScoreChart", () => {
  it("renders with score", () => {
    const { container } = render(<HorizontalScoreChart score={0.75} />);
    expect(container.querySelector("svg")).toBeTruthy();
  });

  it("renders with className prop", () => {
    const { container } = render(<HorizontalScoreChart score={0.5} className="custom-class" />);
    expect(container.querySelector("svg")).toBeTruthy();
  });

  it("renders when score is 0", () => {
    const { container } = render(<HorizontalScoreChart score={0} />);
    expect(container.querySelector("svg")).toBeTruthy();
  });

  it("renders when score is 1", () => {
    const { container } = render(<HorizontalScoreChart score={1} />);
    expect(container.querySelector("svg")).toBeTruthy();
  });
});
