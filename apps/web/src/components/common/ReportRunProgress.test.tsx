import { act, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/components/common/LoadingMessage", () => ({
  LoadingMessage: () => <div>Loading</div>,
}));

const state = vi.hoisted(() => ({
  progress: undefined as undefined | { state: string; url?: string; polls: number },
  listeners: new Set<() => void>(),
}));

vi.mock("@/lib/page-speed-insights/pageSpeedInsightsClient", () => ({
  getPageSpeedProgress: () => state.progress,
  subscribePageSpeedProgress: (l: () => void) => {
    state.listeners.add(l);
    return () => state.listeners.delete(l);
  },
  pollProgressFraction: (polls: number) => Math.min(polls / 10, 0.95),
}));

import { ReportRunProgress } from "@/components/common/ReportRunProgress";

describe("ReportRunProgress", () => {
  it("shows starting, then queued and running states with progress", () => {
    render(<ReportRunProgress publicId="x" />);
    expect(screen.getByTestId("run-state")).toHaveTextContent("Starting");

    act(() => {
      state.progress = { state: "queued", url: "https://a.test", polls: 2 };
      state.listeners.forEach((l) => l());
    });
    expect(screen.getByTestId("run-state")).toHaveTextContent("Queued");
    expect(screen.getByText("https://a.test")).toBeInTheDocument();
    expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "20");

    act(() => {
      state.progress = { state: "running", url: "https://a.test", polls: 5 };
      state.listeners.forEach((l) => l());
    });
    expect(screen.getByTestId("run-state")).toHaveTextContent("Running");
    expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "50");
  });
});
