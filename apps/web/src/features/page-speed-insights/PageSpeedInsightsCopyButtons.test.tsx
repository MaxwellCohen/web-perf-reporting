import { act, fireEvent, render } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { PageSpeedInsightsCopyButtons } from "@/features/page-speed-insights/PageSpeedInsightsCopyButtons";
import type { InsightsContextItem } from "@/lib/page-speed-insights/types";

vi.mock("lucide-react", () => ({
  Check: () => <span data-testid="check" />,
  Copy: () => <span data-testid="copy" />,
}));

const items = [
  { label: "Mobile", item: { id: "m" } },
  { label: "Desktop", item: { id: "d" } },
] as InsightsContextItem[];

describe("PageSpeedInsightsCopyButtons", () => {
  const writeText = vi.fn();

  beforeEach(() => {
    writeText.mockReset().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText },
      writable: true,
      configurable: true,
    });
  });

  it("puts Share in the same row as report copy buttons", () => {
    const { container } = render(
      <PageSpeedInsightsCopyButtons
        items={items}
        shareUrl="https://example.com/viewer?psi=abc"
      />,
    );
    const labels = [...container.querySelectorAll("button")].map((el) => el.textContent);
    expect(labels.some((t) => t?.includes("Share"))).toBe(true);
    expect(labels.some((t) => t?.includes("Mobile"))).toBe(true);
    expect(labels.some((t) => t?.includes("Desktop"))).toBe(true);
    expect(container.querySelectorAll("div.flex").length).toBe(1);
  });

  it("copies the share deep link", async () => {
    const shareUrl = "https://example.com/viewer?psi=abc";
    const { container } = render(
      <PageSpeedInsightsCopyButtons items={items} shareUrl={shareUrl} />,
    );
    const shareButton = [...container.querySelectorAll("button")].find((el) =>
      el.textContent?.includes("Share"),
    );
    fireEvent.click(shareButton!);
    await act(async () => {
      await Promise.resolve();
    });
    expect(writeText).toHaveBeenCalledWith(shareUrl);
  });
});
