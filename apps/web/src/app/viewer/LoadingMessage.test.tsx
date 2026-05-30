import { act, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { LoadingMessage } from "@/app/viewer/LoadingMessage";

describe("app/viewer/LoadingMessage", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("renders the loading text and keeps the interval running", () => {
    const { container } = render(<LoadingMessage />);

    expect(container.firstChild).toMatchSnapshot();

    act(() => {
      vi.advanceTimersByTime(3000);
    });

    expect(container.firstChild).toMatchSnapshot();
  });
});
