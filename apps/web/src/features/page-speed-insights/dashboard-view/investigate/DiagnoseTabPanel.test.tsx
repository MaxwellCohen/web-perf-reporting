import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import exampleReport from "../../../../../test-fixtures/example-report.json";
import type { InsightsContextItem } from "@/lib/page-speed-insights/types";

let items = exampleReport as unknown as InsightsContextItem[];

vi.mock("@/features/page-speed-insights/PageSpeedContext", () => ({
  usePageSpeedItems: () => items,
}));

import { DiagnoseTabPanel } from "@/features/page-speed-insights/dashboard-view/investigate/DiagnoseTabPanel";

describe("DiagnoseTabPanel", () => {
  it("opens on the costliest metric and switches when another is picked", () => {
    render(<DiagnoseTabPanel />);
    expect(screen.getByText("Where TBT goes")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /Largest Contentful Paint/ }));
    expect(screen.getByText("Where LCP goes")).toBeTruthy();
    expect(
      screen.getByRole("button", { name: /Largest Contentful Paint/ }).getAttribute("aria-pressed"),
    ).toBe("true");
  });

  it("shows an empty state without Lighthouse results", () => {
    items = [{ label: "Mobile", item: {} as never }];
    render(<DiagnoseTabPanel />);
    expect(screen.getByText(/no Lighthouse results/)).toBeTruthy();
    items = exampleReport as unknown as InsightsContextItem[];
  });
});
