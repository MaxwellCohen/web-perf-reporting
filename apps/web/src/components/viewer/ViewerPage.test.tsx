import { act, fireEvent, render, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/features/page-speed-insights/pageSpeedInsightsDashboard", () => ({
  PageSpeedInsightsDashboard: ({ data, labels }: { data: unknown[]; labels: string[] }) => (
    <div data-testid="dashboard">
      {data.length} reports, labels: {labels.join(", ")}
    </div>
  ),
}));

vi.mock("lighthouse/report/renderer/text-encoding", () => ({
  TextEncoding: {
    fromBase64: (data: string) => data,
  },
}));

vi.mock("pako", () => ({
  default: {},
}));

const mockAlert = vi.fn();

import ViewerPage from "@/components/viewer/ViewerPage";

describe("ViewerPage", () => {
  beforeEach(() => {
    window.alert = mockAlert;
    window.location.hash = "";
    mockAlert.mockClear();
  });

  it("renders upload and paste tabs when no data", () => {
    const { container } = render(<ViewerPage />);
    expect(container.textContent).toContain("Upload JSON files");
    expect(container.textContent).toContain("Paste JSON");
    expect(container.textContent).toContain("Show Report");
  });

  it("shows dashboard when JSON files uploaded", async () => {
    const { container, getByLabelText } = render(<ViewerPage />);
    const file = new File(
      [JSON.stringify({ lighthouseResult: { categories: {} } })],
      "mobile.json",
      { type: "application/json" },
    );

    fireEvent.change(getByLabelText("Upload JSON Files"), {
      target: { files: [file] },
    });
    fireEvent.click(container.querySelector("button.w-full")!);

    await act(async () => {
      await new Promise((r) => setTimeout(r, 0));
    });

    await waitFor(() => {
      expect(container.querySelector('[data-testid="dashboard"]')).toBeTruthy();
      expect(container.textContent).toContain("labels: mobile");
    });
  });

  it("shows alert when submitting with no files", async () => {
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const { getByText } = render(<ViewerPage />);

    fireEvent.click(getByText("Show Report"));

    await act(async () => {
      await new Promise((r) => setTimeout(r, 0));
    });

    await waitFor(() => {
      expect(mockAlert).toHaveBeenCalledWith("Please upload at least one JSON file");
    });
    consoleErrorSpy.mockRestore();
  });
});
