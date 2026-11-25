import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import exampleReport from "../../../../../test-fixtures/example-report.json";
import type { InsightsContextItem } from "@/lib/page-speed-insights/types";

const items = exampleReport as unknown as InsightsContextItem[];

vi.mock("@/features/page-speed-insights/PageSpeedContext", () => ({
  usePageSpeedItems: () => items,
}));

import { DiagnoseTabPanel } from "@/features/page-speed-insights/dashboard-view/investigate/DiagnoseTabPanel";

describe("TriageView", () => {
  it("toggles to By cause, filters rows, and expands a fix", () => {
    render(<DiagnoseTabPanel />);
    fireEvent.click(screen.getByRole("button", { name: "By cause" }));
    expect(screen.getByText(/We checked 12 common causes\. \d+ are confirmed\./)).toBeTruthy();
    expect(screen.getAllByRole("listitem")).toHaveLength(12);

    fireEvent.click(screen.getByRole("button", { name: /^Ruled out \(/ }));
    const ruledOut = screen.getAllByRole("listitem").length;
    expect(ruledOut).toBeLessThan(12);
    expect(screen.getByRole("button", { name: /^Ruled out \(/ }).getAttribute("aria-pressed")).toBe(
      "true",
    );

    fireEvent.click(screen.getByRole("button", { name: /^All \(/ }));
    const toggle = screen.getAllByRole("button", { name: /^Show details/ })[0];
    fireEvent.click(toggle);
    expect(toggle.getAttribute("aria-expanded")).toBe("true");
    expect(screen.getByText("What to do")).toBeTruthy();
    expect(screen.getByRole("button", { name: /Copy fix prompt/ })).toBeTruthy();
  });
});
