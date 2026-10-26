import { act, fireEvent, render, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/features/page-speed-insights/pageSpeedInsightsDashboard", () => ({
  PageSpeedInsightsDashboard: ({
    data,
    labels,
    shareUrl,
  }: {
    data: unknown[];
    labels: string[];
    shareUrl?: string;
  }) => (
    <div data-testid="dashboard">
      {shareUrl ? <span data-testid="share-url">{shareUrl}</span> : null}
      {data.length} reports, labels: {labels.join(", ")}
    </div>
  ),
}));

vi.mock("@/components/viewer/textEncoding", () => ({
  TextEncoding: {
    fromBase64: (data: string) => data,
    toBase64: async (data: string) => data,
  },
}));

const mockAlert = vi.fn();

import ViewerPage from "@/components/viewer/ViewerPage";

describe("ViewerPage", () => {
  beforeEach(() => {
    window.alert = mockAlert;
    window.location.hash = "";
    mockAlert.mockClear();
    vi.restoreAllMocks();
  });

  it("renders upload and paste tabs when no data", () => {
    const { container } = render(<ViewerPage />);
    expect(container.textContent).toContain("PSI share URL");
    expect(container.textContent).toContain("Upload JSON files");
    expect(container.textContent).toContain("Paste JSON");
    expect(container.textContent).toContain("Show Report");
  });

  it("shows dashboard when JSON files uploaded", async () => {
    const { container, getByLabelText, getByText } = render(<ViewerPage />);
    const file = new File(
      [JSON.stringify({ lighthouseResult: { categories: {} } })],
      "mobile.json",
      { type: "application/json" },
    );

    fireEvent.mouseDown(getByText("Upload JSON files"));
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

    fireEvent.mouseDown(getByText("Upload JSON files"));
    fireEvent.click(getByText("Show Report"));

    await act(async () => {
      await new Promise((r) => setTimeout(r, 0));
    });

    await waitFor(() => {
      expect(mockAlert).toHaveBeenCalledWith("Please upload at least one JSON file");
    });
    consoleErrorSpy.mockRestore();
  });

  it("shows dashboard from a local hash without contacting a server", async () => {
    window.location.hash = JSON.stringify({
      v: 1,
      data: [{ lighthouseResult: { categories: {} } }],
      labels: ["from-hash"],
    });

    const { container } = render(<ViewerPage />);

    await act(async () => {});

    expect(container.querySelector('[data-testid="dashboard"]')).toBeTruthy();
    expect(container.textContent).toContain("labels: from-hash");
  });

  it("writes the report into the URL hash so back restores the input form", async () => {
    const { container, getByLabelText, getByText } = render(<ViewerPage />);
    const file = new File(
      [JSON.stringify({ lighthouseResult: { categories: {} } })],
      "mobile.json",
      { type: "application/json" },
    );

    fireEvent.mouseDown(getByText("Upload JSON files"));
    fireEvent.change(getByLabelText("Upload JSON Files"), {
      target: { files: [file] },
    });
    fireEvent.click(container.querySelector("button.w-full")!);

    await waitFor(() => {
      expect(container.querySelector('[data-testid="dashboard"]')).toBeTruthy();
    });
    expect(window.location.hash.length).toBeGreaterThan(1);
    expect(window.location.hash.includes("http")).toBe(false);

    fireEvent.click(
      [...container.querySelectorAll("button")].find((el) =>
        el.textContent?.includes("Back to input"),
      )!,
    );

    await waitFor(() => {
      expect(container.textContent).toContain("Show Report");
    });
    expect(window.location.hash === "" || window.location.hash === "#").toBe(true);
  });

  it("returns to the input form when the hash is cleared (browser back)", async () => {
    window.location.hash = JSON.stringify({
      v: 1,
      data: [{ lighthouseResult: { categories: {} } }],
      labels: ["from-hash"],
    });

    const { container } = render(<ViewerPage />);

    await act(async () => {});
    expect(container.querySelector('[data-testid="dashboard"]')).toBeTruthy();

    act(() => {
      window.location.hash = "";
      window.dispatchEvent(new HashChangeEvent("hashchange"));
    });

    await waitFor(() => {
      expect(container.textContent).toContain("Show Report");
    });
  });

  it("imports a PSI share URL into the dashboard", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      Response.json({
        data: [{ lighthouseResult: { categories: {} } }],
        labels: ["Mobile"],
      }),
    );
    const { container, getByText, getByLabelText } = render(<ViewerPage />);

    fireEvent.change(getByLabelText("PageSpeed Insights URL"), {
      target: { value: "https://pagespeed.web.dev/analysis/https-example-com/abc" },
    });
    fireEvent.click(getByText("Show Report"));

    await waitFor(() => {
      expect(container.querySelector('[data-testid="dashboard"]')).toBeTruthy();
      expect(container.textContent).toContain("labels: Mobile");
    });
  });

  it("auto-imports a psi query into the dashboard", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      Response.json({
        data: [{ lighthouseResult: { categories: {} } }],
        labels: ["Desktop"],
      }),
    );

    const { container } = render(
      <ViewerPage initialPsi="https://pagespeed.web.dev/analysis/https-example-com/abc" />,
    );

    await waitFor(() => {
      expect(container.textContent).toContain("labels: Desktop");
    });
  });

  it("passes a PSI deep link shareUrl into the dashboard", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      Response.json({
        data: [{ lighthouseResult: { categories: {} } }],
        labels: ["Mobile"],
      }),
    );
    const psi = "https://pagespeed.web.dev/analysis/https-example-com/abc";
    const { container, getByText, getByLabelText } = render(<ViewerPage />);

    fireEvent.change(getByLabelText("PageSpeed Insights URL"), {
      target: { value: psi },
    });
    fireEvent.click(getByText("Show Report"));

    await waitFor(() => {
      expect(container.querySelector('[data-testid="share-url"]')?.textContent).toBe(
        `${window.location.origin}/viewer?psi=${encodeURIComponent(psi)}`,
      );
    });
  });

  it("does not pass shareUrl for JSON file uploads", async () => {
    const { container, getByLabelText, getByText } = render(<ViewerPage />);
    const file = new File(
      [JSON.stringify({ lighthouseResult: { categories: {} } })],
      "mobile.json",
      { type: "application/json" },
    );

    fireEvent.mouseDown(getByText("Upload JSON files"));
    fireEvent.change(getByLabelText("Upload JSON Files"), {
      target: { files: [file] },
    });
    fireEvent.click(container.querySelector("button.w-full")!);

    await waitFor(() => {
      expect(container.querySelector('[data-testid="dashboard"]')).toBeTruthy();
    });
    expect(container.querySelector('[data-testid="share-url"]')).toBeNull();
  });
});
