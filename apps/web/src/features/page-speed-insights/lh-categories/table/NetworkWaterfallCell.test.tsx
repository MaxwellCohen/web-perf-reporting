import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { NetworkWaterfallCell } from "@/features/page-speed-insights/lh-categories/table/NetworkWaterfallCell";

describe("NetworkWaterfallCell", () => {
  it("renders bar with correct position and width", () => {
    const { container } = render(
      <NetworkWaterfallCell requestTime={100} endTime={200} minStart={0} maxEnd={500} />,
    );
    const bar = container.querySelector("[title]");
    expect(bar).toBeTruthy();
    expect(bar?.getAttribute("title")).toContain("100");
    expect(bar?.getAttribute("title")).toContain("200");
  });

  it("renders time labels when showTimeLabels is true", () => {
    const { container } = render(
      <NetworkWaterfallCell
        requestTime={50}
        endTime={150}
        minStart={0}
        maxEnd={200}
        showTimeLabels
      />,
    );
    expect(container.textContent).toContain("50");
    expect(container.textContent).toContain("150");
  });

  it("renders when range is zero", () => {
    const { container } = render(
      <NetworkWaterfallCell requestTime={100} endTime={100} minStart={100} maxEnd={100} />,
    );
    expect(container.firstChild).toBeTruthy();
  });

  it("applies resource type color class", () => {
    const { container } = render(
      <NetworkWaterfallCell
        requestTime={0}
        endTime={100}
        minStart={0}
        maxEnd={1000}
        resourceType="Script"
      />,
    );
    const bar = container.querySelector('[class*="bg-amber-400"]');
    expect(bar).toBeTruthy();
  });

  it("uses Other color for unknown resource type", () => {
    const { container } = render(
      <NetworkWaterfallCell
        requestTime={0}
        endTime={100}
        minStart={0}
        maxEnd={1000}
        resourceType="UnknownType"
      />,
    );
    const bar = container.querySelector('[class*="bg-slate-500"]');
    expect(bar).toBeTruthy();
  });

  it("renders bar with custom width and height", () => {
    const { container } = render(
      <NetworkWaterfallCell
        requestTime={100}
        endTime={250}
        minStart={0}
        maxEnd={500}
        resourceType="Document"
        width={280}
        barHeight={16}
      />,
    );
    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper).toBeTruthy();
    expect(wrapper.style.width).toBe("280px");
  });
});
