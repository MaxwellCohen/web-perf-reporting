import { act, fireEvent, render, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/features/page-speed-insights/pageSpeedInsightsDashboard", () => ({
  PageSpeedInsightsDashboard: ({
    data,
    labels,
    shareUrl,
    headerStart,
  }: {
    data: unknown[];
    labels: string[];
    shareUrl?: string;
    headerStart?: ReactNode;
  }) => (
    <div data-testid="dashboard">
      {headerStart}
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

const mockAlert = vi.fn<() => void>();

import ViewerPage from "@/components/viewer/ViewerPage";

describe("ViewerPage", () => {
  beforeEach(() => {
    window.alert = mockAlert;
    window.location.hash = "";
    mockAlert.mockClear();
    vi.restoreAllMocks();
  });

  it("renders the smart input when no data", () => {
    const { container, getByLabelText, getByText } = render(<ViewerPage />);
    expect(getByLabelText("PSI URL, JSON, or file")).toBeTruthy();
    expect(container.textContent).toContain("Compare with…");
    expect(getByText("Show Report").closest("button")?.disabled).toBe(true);
  });

  it("shows inline validation and enables submit for valid input", () => {
    const { getByLabelText, getByText } = render(<ViewerPage />);
    const input = getByLabelText("PSI URL, JSON, or file");

    fireEvent.change(input, { target: { value: "https://example.com/nope" } });
    expect(getByText("Will run PageSpeed Insights")).toBeTruthy();

    fireEvent.change(input, { target: { value: "not a url" } });
    expect(getByText("Enter a page URL, PSI share URL, or JSON")).toBeTruthy();

    fireEvent.change(input, { target: { value: '{\n  "a": ,\n}' } });
    expect(getByText(/Invalid JSON/)).toBeTruthy();

    fireEvent.change(input, {
      target: {
        value: "https://pagespeed.web.dev/analysis/https-example-com/abc",
      },
    });
    expect(getByText("Valid PSI URL")).toBeTruthy();
    expect(getByText("Show Report").closest("button")?.disabled).toBe(false);
  });

  it("auto-imports when a valid PSI URL is pasted", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation(async () =>
      Response.json({
        data: [{ lighthouseResult: { categories: {} } }],
        labels: ["Mobile"],
      }),
    );
    const { container, getByLabelText } = render(<ViewerPage />);

    fireEvent.paste(getByLabelText("PSI URL, JSON, or file"), {
      clipboardData: {
        getData: () => "https://pagespeed.web.dev/analysis/https-example-com/abc",
      },
    });

    await waitFor(() => {
      expect(container.textContent).toContain("labels: Mobile");
    });
  });

  it("shows dashboard when JSON files uploaded", async () => {
    const { container, getByLabelText, getByText } = render(<ViewerPage />);
    const file = new File(
      [JSON.stringify({ lighthouseResult: { categories: {} } })],
      "mobile.json",
      { type: "application/json" },
    );

    fireEvent.change(getByLabelText("Upload JSON Files"), {
      target: { files: [file] },
    });
    fireEvent.click(getByText("Show Report"));

    await act(async () => {
      await new Promise((r) => setTimeout(r, 0));
    });

    await waitFor(() => {
      expect(container.querySelector('[data-testid="dashboard"]')).toBeTruthy();
      expect(container.textContent).toContain("labels: mobile");
    });
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

    fireEvent.change(getByLabelText("Upload JSON Files"), {
      target: { files: [file] },
    });
    fireEvent.click(getByText("Show Report"));

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
    vi.spyOn(globalThis, "fetch").mockImplementation(async () =>
      Response.json({
        data: [{ lighthouseResult: { categories: {} } }],
        labels: ["Mobile"],
      }),
    );
    const { container, getByText, getByLabelText } = render(<ViewerPage />);

    fireEvent.change(getByLabelText("PSI URL, JSON, or file"), {
      target: {
        value: "https://pagespeed.web.dev/analysis/https-example-com/abc",
      },
    });
    fireEvent.click(getByText("Show Report"));

    await waitFor(() => {
      expect(container.querySelector('[data-testid="dashboard"]')).toBeTruthy();
      expect(container.textContent).toContain("labels: Mobile");
    });
  });

  it("imports two PSI share URLs with run labels into the dashboard", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockImplementation(async () =>
      Response.json({
        data: [{ lighthouseResult: { categories: {} } }],
        labels: ["Mobile"],
      }),
    );
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const { container, getByText, getAllByLabelText } = render(<ViewerPage />);

    fireEvent.change(getAllByLabelText("PSI URL, JSON, or file")[0]!, {
      target: {
        value: "https://pagespeed.web.dev/analysis/https-example-com/a",
      },
    });
    fireEvent.click(getByText("+ Add label"));
    fireEvent.change(getAllByLabelText("Run label (optional)")[0]!, {
      target: { value: "Before" },
    });
    fireEvent.click(getByText("Compare with…"));
    fireEvent.change(getAllByLabelText("PSI URL, JSON, or file")[1]!, {
      target: {
        value: "https://pagespeed.web.dev/analysis/https-example-com/b",
      },
    });
    fireEvent.click(getByText("+ Add label"));
    fireEvent.change(getAllByLabelText("Run label (optional)")[1]!, {
      target: { value: "After" },
    });
    fireEvent.click(getByText("Show Report"));

    await waitFor(() => {
      expect(container.querySelector('[data-testid="dashboard"]')).toBeTruthy();
      expect(container.textContent).toContain("labels: Before · Mobile, After · Mobile");
    });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    consoleErrorSpy.mockRestore();
  });

  it("auto-imports a psi query into the dashboard", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation(async () =>
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
    vi.spyOn(globalThis, "fetch").mockImplementation(async () =>
      Response.json({
        data: [{ lighthouseResult: { categories: {} } }],
        labels: ["Mobile"],
      }),
    );
    const psi = "https://pagespeed.web.dev/analysis/https-example-com/abc";
    const { container, getByText, getByLabelText } = render(<ViewerPage />);

    fireEvent.change(getByLabelText("PSI URL, JSON, or file"), {
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

    fireEvent.change(getByLabelText("Upload JSON Files"), {
      target: { files: [file] },
    });
    fireEvent.click(getByText("Show Report"));

    await waitFor(() => {
      expect(container.querySelector('[data-testid="dashboard"]')).toBeTruthy();
    });
    expect(container.querySelector('[data-testid="share-url"]')).toBeNull();
  });
});
