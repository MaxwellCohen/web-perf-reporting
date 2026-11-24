import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { CulpritMatrix } from "@/features/page-speed-insights/dashboard-view/resources-story/CulpritMatrix";
import type { PageSpeedInsights } from "@/lib/schema";

const patch = vi.fn();
vi.mock("@/features/page-speed-insights/dashboard-view/dashboardSearch", () => ({
  patchDashboardSearch: (...args: unknown[]) => patch(...args),
}));

const MINE = "https://example.com/app.css";
const VENDOR = "https://cdn.vendor.com/sdk.js";

const item = {
  loadingExperience: { overall_category: "FAST", metrics: {} },
  lighthouseResult: {
    finalUrl: "https://example.com/",
    configSettings: { formFactor: "mobile" },
    entities: [
      { name: "example.com", isFirstParty: true, isUnrecognized: false, origins: [] },
      { name: "Vendor", isFirstParty: false, isUnrecognized: false, origins: [] },
    ],
    audits: {
      "network-requests": {
        id: "network-requests",
        title: "n",
        details: {
          type: "table",
          items: [
            { url: MINE, resourceType: "Stylesheet", transferSize: 2000, entity: "example.com" },
            { url: VENDOR, resourceType: "Script", transferSize: 9000, entity: "Vendor" },
          ],
        },
      },
      "render-blocking-insight": {
        id: "render-blocking-insight",
        title: "Render blocking",
        score: 0.5,
        details: { type: "table", items: [{ url: MINE, wastedMs: 300 }] },
      },
      "bootup-time": {
        id: "bootup-time",
        title: "Bootup",
        score: 0.5,
        details: { type: "table", items: [{ url: VENDOR, scripting: 800 }] },
      },
    },
  },
} as unknown as PageSpeedInsights;

function fileOrder() {
  return screen
    .getAllByRole("row")
    .slice(1)
    .map((r) => r.textContent ?? "");
}

describe("CulpritMatrix", () => {
  it("re-sorts when a column header is clicked", () => {
    render(<CulpritMatrix item={item} />);
    expect(fileOrder()[0]).toContain("app.css");
    fireEvent.click(screen.getByRole("button", { name: /^TBT/ }));
    expect(fileOrder()[0]).toContain("sdk.js");
    expect(screen.getByRole("columnheader", { name: /TBT/ })).toHaveAttribute(
      "aria-sort",
      "descending",
    );
  });

  it("filters by party", () => {
    render(<CulpritMatrix item={item} />);
    fireEvent.click(screen.getByRole("button", { name: "Third-party" }));
    expect(screen.getByRole("button", { name: "Third-party" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    const rows = fileOrder();
    expect(rows).toHaveLength(1);
    expect(rows[0]).toContain("sdk.js");
  });

  it("expands a row to show findings and the waterfall link", () => {
    render(<CulpritMatrix item={item} />);
    const toggle = screen.getByRole("button", { name: /findings for .*app\.css/ });
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute("aria-expanded", "true");
    const region = screen.getAllByRole("row")[2];
    expect(within(region).getByText("Render blocking")).toBeInTheDocument();
    expect(screen.getByText(/Copy fix prompt for/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Show in waterfall" }));
    expect(patch).toHaveBeenCalledWith({ tab: "timeline", query: MINE }, "push");
  });
});
