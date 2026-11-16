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

  it("renders immediately with the first analysis stage", () => {
    render(<LoadingMessage />);

    expect(
      screen.getByRole("status", { name: "Generating PageSpeed Insights report" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Launching lab tests…")).toBeInTheDocument();
    expect(screen.getByText("0:00")).toBeInTheDocument();
    expect(screen.getAllByRole("listitem")).toHaveLength(5);
    expect(screen.getByText("running")).toBeInTheDocument();
  });

  it("increments elapsed time and advances analysis stages over time", () => {
    render(<LoadingMessage />);

    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(screen.getByText("0:01")).toBeInTheDocument();
    expect(screen.getByText("Launching lab tests…")).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(5000);
    });
    expect(screen.getByText("0:06")).toBeInTheDocument();
    expect(screen.getByText("Measuring Core Web Vitals…")).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(5000);
    });
    expect(screen.getByText("0:11")).toBeInTheDocument();
    expect(screen.getByText("Auditing resources & network…")).toBeInTheDocument();
  });

  it("renders the CrUX lookup variant", () => {
    render(<LoadingMessage variant="crux" />);

    expect(screen.getByText("Looking up CrUX data")).toBeInTheDocument();
    expect(screen.getAllByText(/Querying Chrome UX Report/).length).toBeGreaterThan(0);
    expect(screen.getByText("looking up")).toBeInTheDocument();
    expect(screen.queryByText(/Launching lab tests/)).not.toBeInTheDocument();
  });
});
