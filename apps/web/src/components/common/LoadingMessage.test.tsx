import { act, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { LoadingMessage } from "@/components/common/LoadingMessage";

describe("LoadingMessage", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("renders immediately with the first analysis stage", () => {
    const { container } = render(<LoadingMessage />);

    expect(container.firstChild).toMatchSnapshot();
  });

  it("increments elapsed time and advances analysis stages over time", () => {
    const { container } = render(<LoadingMessage />);

    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(container.firstChild).toMatchSnapshot();

    act(() => {
      vi.advanceTimersByTime(5000);
    });
    expect(container.firstChild).toMatchSnapshot();

    act(() => {
      vi.advanceTimersByTime(5000);
    });
    expect(container.firstChild).toMatchSnapshot();
  });
});
