import { act, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { LoadingMessage } from "@/components/common/LoadingMessage";

describe("LoadingMessage", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("stays hidden for the first two seconds and then appears", () => {
    const { container } = render(<LoadingMessage />);

    expect(container.firstChild).toMatchSnapshot();

    act(() => {
      vi.advanceTimersByTime(1999);
    });
    expect(container.firstChild).toMatchSnapshot();

    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(container.firstChild).toMatchSnapshot();
  });

  it("increments elapsed time and rotates loading messages over time", () => {
    const { container } = render(<LoadingMessage />);

    act(() => {
      vi.advanceTimersByTime(2000);
    });
    expect(container.firstChild).toMatchSnapshot();

    act(() => {
      vi.advanceTimersByTime(2000);
    });
    expect(container.firstChild).toMatchSnapshot();

    act(() => {
      vi.advanceTimersByTime(4000);
    });
    expect(container.firstChild).toMatchSnapshot();
  });
});
