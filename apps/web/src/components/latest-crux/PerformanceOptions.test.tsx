import { fireEvent, render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { PerformanceOptions } from "@/components/latest-crux/PerformanceOptions";

vi.mock("lucide-react", () => ({
  CalendarIcon: () => <span data-testid="calendar" />,
}));

vi.mock("@/components/common/OptionsSelector", () => ({
  OptionsSelector: ({
    title,
    onValueChange,
    options,
  }: {
    title: string;
    onValueChange: (v: string) => void;
    options: { value?: string; label?: string }[];
  }) => (
    <div data-testid={`options-${title.replace(/\s/g, "-")}`}>
      <span>{title}</span>
      {Array.isArray(options) &&
        options.slice(0, 2).map((opt) => (
          <button
            key={opt?.value ?? opt?.label ?? String(opt)}
            type="button"
            onClick={() => onValueChange(opt?.value ?? String(opt))}
          >
            {opt?.label ?? String(opt)}
          </button>
        ))}
    </div>
  ),
}));

vi.mock("@/components/ui/popover", () => ({
  Popover: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  PopoverContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  PopoverTrigger: ({ children, asChild }: { children: React.ReactNode; asChild?: boolean }) =>
    asChild ? <>{children}</> : <div>{children}</div>,
}));

describe("PerformanceOptions", () => {
  it("renders options selectors", () => {
    const { container } = render(
      <PerformanceOptions
        setChartType={vi.fn()}
        setReportScope={vi.fn()}
        setDeviceType={vi.fn()}
        chartKeys={["bar", "line"]}
      />,
    );
    expect(container.textContent).toContain("Report Scope");
    expect(container.textContent).toContain("Device");
    expect(container.textContent).toContain("Chart type");
  });

  it("calls setChartType when chart type changes", () => {
    const setChartType = vi.fn();
    const { container } = render(
      <PerformanceOptions
        setChartType={setChartType}
        setReportScope={vi.fn()}
        setDeviceType={vi.fn()}
        chartKeys={["bar", "line"]}
      />,
    );
    const chartOptions = container.querySelector('[data-testid="options-Chart-type"]');
    const barButton = chartOptions?.querySelector("button");
    if (barButton) {
      fireEvent.click(barButton);
      expect(setChartType).toHaveBeenCalled();
    }
  });

  it("renders children when provided", () => {
    const { container } = render(
      <PerformanceOptions
        setChartType={vi.fn()}
        setReportScope={vi.fn()}
        setDeviceType={vi.fn()}
        chartKeys={[]}
      >
        <div data-testid="child">Child content</div>
      </PerformanceOptions>,
    );
    expect(container.querySelector('[data-testid="child"]')).toBeTruthy();
    expect(container.textContent).toContain("Child content");
  });

  it("renders date range section when setDateRange is provided", () => {
    const setDateRange = vi.fn();
    const { container } = render(
      <PerformanceOptions
        setChartType={vi.fn()}
        setReportScope={vi.fn()}
        setDeviceType={vi.fn()}
        chartKeys={[]}
        dateRange={{ startDate: null, endDate: null }}
        setDateRange={setDateRange}
      />,
    );
    expect(container.textContent).toContain("Date Range");
    expect(container.textContent).toContain("Select date range");
  });

  it("displays formatted date range when both dates provided", () => {
    const { container } = render(
      <PerformanceOptions
        setChartType={vi.fn()}
        setReportScope={vi.fn()}
        setDeviceType={vi.fn()}
        chartKeys={[]}
        dateRange={{
          startDate: "2024-01-15",
          endDate: "2024-01-31",
        }}
        setDateRange={vi.fn()}
      />,
    );
    expect(container.textContent).toContain("Jan");
    expect(container.textContent).toContain("2024");
  });

  it("calls setDateRange when start date changes", () => {
    const setDateRange = vi.fn();
    const { container } = render(
      <PerformanceOptions
        setChartType={vi.fn()}
        setReportScope={vi.fn()}
        setDeviceType={vi.fn()}
        chartKeys={[]}
        dateRange={{
          startDate: "2024-01-01",
          endDate: "2024-01-31",
        }}
        setDateRange={setDateRange}
      />,
    );
    const startInput = container.querySelector('input[id*="date-range-start"]');
    fireEvent.change(startInput!, { target: { value: "2024-01-10" } });
    expect(setDateRange).toHaveBeenCalledWith({
      startDate: "2024-01-10",
      endDate: "2024-01-31",
    });
  });

  it("calls setDateRange when end date changes", () => {
    const setDateRange = vi.fn();
    const { container } = render(
      <PerformanceOptions
        setChartType={vi.fn()}
        setReportScope={vi.fn()}
        setDeviceType={vi.fn()}
        chartKeys={[]}
        dateRange={{
          startDate: "2024-01-01",
          endDate: "2024-01-31",
        }}
        setDateRange={setDateRange}
      />,
    );
    const endInput = container.querySelector('input[id*="date-range-end"]');
    fireEvent.change(endInput!, { target: { value: "2024-02-15" } });
    expect(setDateRange).toHaveBeenCalledWith({
      startDate: "2024-01-01",
      endDate: "2024-02-15",
    });
  });

  it("displays From date when only startDate provided", () => {
    const { container } = render(
      <PerformanceOptions
        setChartType={vi.fn()}
        setReportScope={vi.fn()}
        setDeviceType={vi.fn()}
        chartKeys={[]}
        dateRange={{
          startDate: "2024-06-15",
          endDate: null,
        }}
        setDateRange={vi.fn()}
      />,
    );
    expect(container.textContent).toContain("From");
  });

  it("displays Until date when only endDate provided", () => {
    const { container } = render(
      <PerformanceOptions
        setChartType={vi.fn()}
        setReportScope={vi.fn()}
        setDeviceType={vi.fn()}
        chartKeys={[]}
        dateRange={{
          startDate: null,
          endDate: "2024-12-31",
        }}
        setDateRange={vi.fn()}
      />,
    );
    expect(container.textContent).toContain("Until");
  });
});
