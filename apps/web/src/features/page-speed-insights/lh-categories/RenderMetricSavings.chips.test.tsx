import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { RenderMetricSavings } from "@/features/page-speed-insights/lh-categories/RenderMetricSavings";

const a = (metricSavings: Record<string, number>) => ({
  id: "a",
  score: 0,
  scoreDisplayMode: "metricSavings" as const,
  title: "A",
  metricSavings,
});

describe("RenderMetricSavings chips", () => {
  it("formats ms and unitless CLS for a single report without a label", () => {
    const { container } = render(
      <RenderMetricSavings auditData={[a({ LCP: 320, CLS: 0.05, FCP: 0 })]} labels={["Mobile"]} />,
    );
    const chips = [...container.querySelectorAll("li")].map((li) => li.textContent);
    expect(chips).toEqual(["LCP −320 ms", "CLS −0.05"]);
    expect(container.textContent).not.toContain("Mobile");
  });

  it("groups chips by report label and hides all-zero metrics", () => {
    const { container } = render(
      <RenderMetricSavings
        auditData={[a({ LCP: 1500, TBT: 0 }), a({ LCP: 0, TBT: 0, INP: 80 })]}
        labels={["Mobile", "Desktop"]}
      />,
    );
    expect(container.textContent).toContain("Mobile");
    expect(container.textContent).toContain("Desktop");
    const chips = [...container.querySelectorAll("li")].map((li) => li.textContent);
    expect(chips).toEqual(["LCP −1.50 s", "INP −80 ms"]);
  });
});
