import type { ReactNode } from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { OptionsSelector } from "@/components/common/OptionsSelector";

const chartSelectorSpy =
  vi.fn<
    (props: { id: string; options: unknown[]; onValueChange: (value: string) => void }) => void
  >();

vi.mock("@/components/common/ChartSelector", () => ({
  ChartSelector: ({
    id,
    options,
    onValueChange,
  }: {
    id: string;
    options: unknown[];
    onValueChange: (value: string) => void;
  }) => {
    chartSelectorSpy({ id, options, onValueChange });
    return <div data-testid="chart-selector">Chart selector</div>;
  },
}));

vi.mock("@/components/ui/label", () => ({
  Label: ({ children, htmlFor }: { children: ReactNode; htmlFor?: string }) => (
    <label htmlFor={htmlFor}>{children}</label>
  ),
}));

describe("OptionsSelector", () => {
  it("renders the title label and passes props through to ChartSelector", () => {
    render(
      <OptionsSelector
        id="metric-selector"
        title="Metric"
        options={["LCP", "CLS"]}
        onValueChange={() => {}}
      />,
    );

    expect(screen.getByText("Metric")).toBeInTheDocument();
    expect(screen.getByTestId("chart-selector")).toBeInTheDocument();
    expect(chartSelectorSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "metric-selector",
        options: ["LCP", "CLS"],
      }),
    );
  });
});
