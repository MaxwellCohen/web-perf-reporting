import { render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ComparePanel } from "./ComparePanel";
import { FindingsPanel } from "./FindingsPanel";
import { SharedSummary } from "./SharedSummary";
import { heavySnapshot } from "./testSnapshot";

describe("FindingsPanel", () => {
  it("renders findings, accessible category bar, scripts, shifts and copy buttons", async () => {
    render(<FindingsPanel snapshot={heavySnapshot()} />);
    expect(screen.getByText(/main-thread task/)).toBeTruthy();
    expect(screen.getByRole("img", { name: /Main-thread time by category: script/ })).toBeTruthy();
    expect(screen.getByText("Top scripts")).toBeTruthy();
    expect(screen.getByText(/Layout shifts/)).toBeTruthy();
    expect(screen.getByLabelText("Copy findings as AI prompt")).toBeTruthy();
    const share = screen.getByLabelText("Copy share link") as HTMLButtonElement;
    await waitFor(() => expect(share.disabled).toBe(false));
  });

  it("hides share link when shared", () => {
    render(<FindingsPanel snapshot={heavySnapshot()} shared />);
    expect(screen.queryByLabelText("Copy share link")).toBeNull();
  });
});

describe("ComparePanel", () => {
  it("colours improvements green and regressions red", () => {
    const { container } = render(
      <ComparePanel before={heavySnapshot(undefined, 600)} after={heavySnapshot(undefined, 100)} />,
    );
    expect(container.querySelector(".text-emerald-600")).toBeTruthy();
    expect(screen.getByText("Top script changes")).toBeTruthy();
    const worse = render(
      <ComparePanel before={heavySnapshot(undefined, 100)} after={heavySnapshot(undefined, 600)} />,
    );
    expect(worse.container.querySelector(".text-red-600")).toBeTruthy();
  });
});

describe("SharedSummary", () => {
  it("shows the banner", () => {
    render(<SharedSummary snapshot={heavySnapshot()} />);
    expect(
      screen.getByText("Shared summary — load the trace file for the full timeline"),
    ).toBeTruthy();
  });
});
