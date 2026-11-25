import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import exampleReport from "../../../../../test-fixtures/example-report.json";
import { ImpactRanking } from "@/features/page-speed-insights/dashboard-view/recommendations-story/ImpactRanking";
import { buildImpactOpportunities } from "@/features/page-speed-insights/dashboard-view/recommendations-story/impactModel";
import type { PageSpeedDashboardItem } from "@/lib/page-speed-insights/types";

const { item } = (exampleReport as unknown as PageSpeedDashboardItem[])[0];
const opportunities = buildImpactOpportunities(item);

function rows() {
  return within(screen.getByRole("list", { name: "Ranked fixes" })).getAllByRole("button");
}

describe("ImpactRanking", () => {
  it("hides rows that do not match the metric filter", () => {
    render(<ImpactRanking item={item} />);
    const all = rows().length;
    expect(all).toBe(opportunities.length);
    fireEvent.click(screen.getByRole("button", { name: "TBT" }));
    expect(screen.getByRole("button", { name: "TBT" }).getAttribute("aria-pressed")).toBe("true");
    expect(rows().length).toBeLessThan(all);
    expect(rows().length).toBe(opportunities.filter((o) => o.metrics.includes("TBT")).length);
  });

  it("adding to the plan raises the projected score", () => {
    render(<ImpactRanking item={item} />);
    const projected = () =>
      Number(
        screen.getByText("With your plan (est.)").nextElementSibling?.textContent ?? Number.NaN,
      );
    const before = projected();
    fireEvent.click(screen.getByRole("button", { name: "Add to plan" }));
    expect(screen.getByRole("button", { name: "✓ In plan — remove" })).toBeTruthy();
    expect(projected()).toBeGreaterThan(before);
    expect(screen.getByText("Copy plan as prompt")).toBeTruthy();
  });

  it("selecting a row shows its files", () => {
    const withFiles = opportunities.findIndex((o) => o.files.length > 0);
    render(<ImpactRanking item={item} />);
    fireEvent.click(rows()[withFiles]);
    const detail = screen.getByRole("article", { name: "Selected fix" });
    expect(within(detail).getByText("Files involved")).toBeTruthy();
    expect(within(detail).getByText(opportunities[withFiles].files[0].url)).toBeTruthy();
  });
});
