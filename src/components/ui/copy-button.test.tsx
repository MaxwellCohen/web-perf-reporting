import { act, fireEvent, render } from "@testing-library/react";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { CopyButton } from "@/components/ui/copy-button";

vi.mock("lucide-react", () => ({
  Check: () => <span data-testid="check" />,
  Copy: () => <span data-testid="copy" />,
}));

describe("CopyButton", () => {
  const writeText = vi.fn();

  beforeAll(() => {
    vi.useFakeTimers();
  });

  afterAll(() => {
    vi.useRealTimers();
  });

  beforeEach(() => {
    writeText.mockReset();
    // happy-dom's navigator.clipboard has only a getter; use defineProperty
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText },
      writable: true,
      configurable: true,
    });
  });

  it("copies text when clicked and then resets its copied state", async () => {
    const { container } = render(
      <CopyButton text="https://example.com" resetDelay={10}>
        Copy URL
      </CopyButton>,
    );
    expect(container.firstChild).toMatchSnapshot();

    const button = container.querySelector("button");
    fireEvent.click(button!);

    await act(async () => {
      await Promise.resolve();
    });
    expect(writeText).toHaveBeenCalledWith("https://example.com");
    expect(button!.querySelector('[data-testid="check"]')).not.toBeNull();

    await act(async () => {
      await vi.runAllTimersAsync();
    });
    expect(button!.querySelector('[data-testid="copy"]')).not.toBeNull();
  });
});
