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
  it("renders title and priority label", () => {
    const { container } = render(<RecommendationHeader recommendation={baseRec} />);
    expect(container.textContent).toContain("Test Title");
    expect(container.textContent).toContain("High priority");
  });

  it("renders estimated savings when impact has savings", () => {
    const rec: Recommendation = {
      ...baseRec,
      impact: { metric: "LCP", savings: 500, unit: "ms" },
    };
    const { container } = render(<RecommendationHeader recommendation={rec} peerMaxSavings={1000} />);
    expect(container.textContent).toContain("Est. savings");
    expect(container.textContent).toContain("500 ms");
    expect(container.textContent).toContain("LCP");
    expect(container.querySelector("[aria-hidden]")).toBeTruthy();
  });

  it("formats byte savings without treating them as milliseconds", () => {
    const rec: Recommendation = {
      ...baseRec,
      impact: { savings: 2048, unit: "bytes" },
    };
    const { container } = render(<RecommendationHeader recommendation={rec} />);
    expect(container.textContent).toContain("2.0 KiB");
    expect(container.textContent).not.toContain("2048 ms");
  });

  it("does not render savings when impact missing savings", () => {
    const { container } = render(<RecommendationHeader recommendation={baseRec} />);
    expect(container.textContent).not.toContain("Est. savings");
  });

  it("renders markdown link in title", () => {
    const rec: Recommendation = {
      ...baseRec,
      title: "Fix [this issue](https://example.com)",
    };
    const { container } = render(<RecommendationHeader recommendation={rec} />);
    const link = container.querySelector('a[href="https://example.com"]');
    expect(link).toBeTruthy();
    expect(link?.getAttribute("target")).toBe("_blank");
    expect(link?.getAttribute("rel")).toBe("noopener noreferrer");
  });
});
