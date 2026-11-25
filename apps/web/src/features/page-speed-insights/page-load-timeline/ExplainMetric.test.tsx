import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import exampleReport from "../../../../test-fixtures/example-report.json";
import type { PageSpeedDashboardItem } from "@/lib/page-speed-insights/types";

const mockItems = vi.hoisted(() => ({ current: [] as unknown[] }));
vi.mock("@/features/page-speed-insights/PageSpeedContext", () => ({
  usePageSpeedItems: () => mockItems.current,
}));

import { collectTimelineSources } from "./collectTimelineSources";
import { ExplainMetric } from "./ExplainMetric";

const example = exampleReport as unknown as PageSpeedDashboardItem[];

describe("ExplainMetric", () => {
  mockItems.current = example;
  const load = collectTimelineSources(example[0])!;
  const entries = [{ label: example[0].label, load }];

  it("changes the headline when the mode changes", () => {
    render(<ExplainMetric entries={entries} />);
    const lcp = screen.getByTestId("explain-headline").textContent;
    fireEvent.click(screen.getByRole("tab", { name: "TBT" }));
    expect(screen.getByRole("tab", { name: "TBT" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByTestId("explain-headline").textContent).not.toBe(lcp);
  });

  it("opens the detail panel when a row is clicked", () => {
    render(<ExplainMetric entries={entries} />);
    expect(screen.queryByTestId("explain-detail")).toBeNull();
    fireEvent.click(screen.getAllByTestId("explain-row")[0]);
    expect(screen.getByTestId("explain-detail")).toHaveTextContent("Why it matters");
    expect(screen.getByRole("button", { name: /copy fix prompt/i })).toBeTruthy();
  });
});
