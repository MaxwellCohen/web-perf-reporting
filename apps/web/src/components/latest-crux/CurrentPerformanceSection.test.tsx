import { render, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/components/latest-crux/PerformanceDashboard", () => ({
  CurrentPerformanceDashboard: ({
    reportMap,
    pendingKeys = [],
  }: {
    reportMap: Record<string, unknown>;
    pendingKeys?: string[];
  }) => (
    <div data-testid="dashboard">
      Dashboard with {Object.keys(reportMap).length} reports and {pendingKeys.length} pending
    </div>
  ),
}));

vi.mock("@/components/common/LoadingMessage", () => ({
  LoadingMessage: () => <div data-testid="loading-message">Loading</div>,
}));

import { CurrentPerformanceSection } from "@/components/latest-crux/CurrentPerformanceSection";

const readyJob = {
  jobId: "job-1",
  pageUrl: "https://example.com",
  kind: "current",
  slots: [
    "originAll",
    "urlAll",
    "originDESKTOP",
    "urlDESKTOP",
    "originTABLET",
    "urlTABLET",
    "originPHONE",
    "urlPHONE",
  ].map((key) => ({ key, status: "ready", report: { record: {} } })),
};

describe("CurrentPerformanceSection", () => {
  it("starts one CrUX job and renders each ready slot", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      json: async () => readyJob,
    } as Response);

    const { container } = render(<CurrentPerformanceSection url="https://example.com" />);

    await waitFor(() => {
      expect(container.querySelector('[data-testid="dashboard"]')).toBeTruthy();
    });
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/crux/current",
      expect.objectContaining({ method: "POST" }),
    );
    expect(container.textContent).toContain("8 reports");
    expect(container.textContent).toContain("0 pending");
  });

  it("shows loading until a slot is ready, then keeps pending slots marked", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      json: async () => ({
        ...readyJob,
        slots: readyJob.slots.map((slot) =>
          slot.key === "originPHONE" ? { ...slot, status: "pending", report: null } : slot,
        ),
      }),
    } as Response);

    const { container } = render(<CurrentPerformanceSection url="https://test.com" />);

    await waitFor(() => {
      expect(container.textContent).toContain("1 pending");
    });
  });
});
