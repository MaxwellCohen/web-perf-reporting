import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { RecommendationHeader } from "@/features/page-speed-insights/RecommendationsSection/RecommendationHeader";
import type { Recommendation } from "@/features/page-speed-insights/RecommendationsSection/types";

const baseRec: Recommendation = {
  id: "test-id",
  title: "Test Title",
  description: "Desc",
  priority: "high",
  category: "Performance",
  impact: {},
  actionableSteps: [],
};

describe("RecommendationHeader", () => {
  it("renders title and priority badge", () => {
    const { container } = render(
      <RecommendationHeader recommendation={baseRec} priorityColors={{ high: "bg-red-500" }} />,
    );
    expect(container.textContent).toContain("Test Title");
    expect(container.textContent).toContain("high");
  });

  it("renders potential savings when impact has metric and savings", () => {
    const rec: Recommendation = {
      ...baseRec,
      impact: { metric: "LCP", savings: 500, unit: "ms" },
    };
    const { container } = render(
      <RecommendationHeader recommendation={rec} priorityColors={{ high: "bg-red-500" }} />,
    );
    expect(container.textContent).toContain("Potential savings");
    expect(container.textContent).toContain("500 ms");
    expect(container.textContent).toContain("LCP");
  });

  it("does not render savings when impact missing metric or savings", () => {
    const { container } = render(
      <RecommendationHeader recommendation={baseRec} priorityColors={{ high: "bg-red-500" }} />,
    );
    expect(container.textContent).not.toContain("Potential savings");
  });

  it("renders markdown link in title", () => {
    const rec: Recommendation = {
      ...baseRec,
      title: "Fix [this issue](https://example.com)",
    };
    const { container } = render(
      <RecommendationHeader recommendation={rec} priorityColors={{ high: "bg-red-500" }} />,
    );
    const link = container.querySelector('a[href="https://example.com"]');
    expect(link).toBeTruthy();
    expect(link?.getAttribute("target")).toBe("_blank");
    expect(link?.getAttribute("rel")).toBe("noopener noreferrer");
  });
});
