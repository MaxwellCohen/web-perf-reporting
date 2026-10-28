import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { InsightsContextItem } from "@/lib/page-speed-insights/types";
import {
  KB,
  weightReport,
} from "@/features/page-speed-insights/dashboard-view/page-weight/pageWeightFixtures";

let items: InsightsContextItem[] = [];

vi.mock("@/features/page-speed-insights/PageSpeedContext", () => ({
  usePageSpeedItems: () => items,
}));

import { PageWeightStory } from "@/features/page-speed-insights/dashboard-view/page-weight/PageWeightStory";

const before = weightReport("Before · Mobile", [
  { url: "https://a.com/app.js", resourceType: "Script", transferSize: 200 * KB },
  { url: "https://a.com/old.css", resourceType: "Stylesheet", transferSize: 10 * KB },
]);
const after = weightReport("After · Mobile", [
  { url: "https://a.com/app.js", resourceType: "Script", transferSize: 100 * KB },
  { url: "https://a.com/hero.jpg", resourceType: "Image", transferSize: 50 * KB },
]);

describe("PageWeightStory", () => {
  afterEach(() => {
    items = [];
    window.history.replaceState(null, "", "/");
  });

  it("says when there is nothing to measure", () => {
    render(<PageWeightStory />);
    expect(
      screen.getByText("This report has no resource sizes to measure page weight."),
    ).toBeInTheDocument();
  });

  it("shows a single report's weight", () => {
    items = [before];
    render(<PageWeightStory />);
    expect(screen.getByText("210.0 KiB")).toBeInTheDocument();
    expect(screen.getByRole("table", { name: "Heaviest URLs" })).toBeInTheDocument();
    expect(screen.queryByRole("group", { name: "Reports to compare" })).not.toBeInTheDocument();
  });

  it("compares the two runs by default", () => {
    items = [before, after];
    render(<PageWeightStory />);

    expect(screen.getByTestId("page-weight-delta")).toHaveTextContent("−60.0 KiB");
    expect(screen.getByRole("table", { name: "URL changes" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "New (1)" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Gone (1)" })).toBeInTheDocument();
  });

  it("drops back to a single report when one is deselected", () => {
    items = [before, after];
    render(<PageWeightStory />);

    fireEvent.click(screen.getByRole("button", { name: "After · Mobile" }));

    expect(new URLSearchParams(window.location.search).getAll("report")).toEqual([
      "Before · Mobile",
    ]);
    expect(screen.getByRole("table", { name: "Heaviest URLs" })).toBeInTheDocument();
  });
});
