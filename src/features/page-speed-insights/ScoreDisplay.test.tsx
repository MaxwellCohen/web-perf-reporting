import { render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("lucide-react", () => ({
  Check: () => null,
  X: () => null,
}));

import {
  ScoreDisplay,
  ScoreDisplayModes,
  isEmptyResult,
  sortByScoreDisplayModes,
} from "@/features/page-speed-insights/ScoreDisplay";

describe("ScoreDisplay", () => {
  it("returns null when audit is undefined", () => {
    const { container } = render(<ScoreDisplay />);
    expect(container.firstChild).toBeNull();
  });

  it("returns null when audit.score is null", () => {
    const audit = {
      id: "test",
      title: "Test",
      score: null,
      scoreDisplayMode: "numeric" as const,
    };
    const { container } = render(<ScoreDisplay audit={audit} />);
    expect(container.firstChild).toBeNull();
  });

  it("returns null when audit.scoreDisplayMode is undefined", () => {
    const audit = {
      id: "test",
      title: "Test",
      score: 0.9,
    };
    const { container } = render(<ScoreDisplay audit={audit as any} />);
    expect(container.firstChild).toBeNull();
  });

  it("renders numeric score with displayValue", () => {
    const audit = {
      id: "fcp",
      title: "First Contentful Paint",
      score: 0.9,
      scoreDisplayMode: "numeric" as const,
      displayValue: "1.2 s",
    };
    const { container } = render(<ScoreDisplay audit={audit} />);
    expect(container.firstChild).toMatchSnapshot();
  });

  it("renders numeric score without displayValue", () => {
    const audit = {
      id: "fcp",
      title: "First Contentful Paint",
      score: 0.85,
      scoreDisplayMode: "numeric" as const,
    };
    const { container } = render(<ScoreDisplay audit={audit} />);
    expect(container.firstChild).toMatchSnapshot();
  });

  it("renders binary passed", () => {
    const audit = {
      id: "test",
      title: "Test",
      score: 1,
      scoreDisplayMode: "binary" as const,
    };
    const { container } = render(<ScoreDisplay audit={audit} />);
    expect(container.firstChild).toMatchSnapshot();
  });

  it("renders binary failed", () => {
    const audit = {
      id: "test",
      title: "Test",
      score: 0,
      scoreDisplayMode: "binary" as const,
    };
    const { container } = render(<ScoreDisplay audit={audit} />);
    expect(container.firstChild).toMatchSnapshot();
  });

  it("renders device label when provided", () => {
    const audit = {
      id: "test",
      title: "Test",
      score: 1,
      scoreDisplayMode: "binary" as const,
    };
    const { container } = render(<ScoreDisplay audit={audit} device="Mobile" />);
    expect(container.firstChild).toMatchSnapshot();
  });

  it("renders manual mode", () => {
    const audit = {
      id: "test",
      title: "Test",
      score: 0,
      scoreDisplayMode: "manual" as const,
    };
    const { container } = render(<ScoreDisplay audit={audit} />);
    expect(container.firstChild).toMatchSnapshot();
  });

  it("returns null for informative mode", () => {
    const audit = {
      id: "test",
      title: "Test",
      score: null,
      scoreDisplayMode: "informative" as const,
    };
    const { container } = render(<ScoreDisplay audit={audit} />);
    expect(container.firstChild).toBeNull();
  });

  it("renders not applicable mode", () => {
    const audit = {
      id: "test",
      title: "Test",
      score: 0,
      scoreDisplayMode: "notApplicable" as const,
    };
    const { container } = render(<ScoreDisplay audit={audit} />);
    expect(container.firstChild).toMatchSnapshot();
  });

  it("renders error mode with errorMessage", () => {
    const audit = {
      id: "test",
      title: "Test",
      score: 0,
      scoreDisplayMode: "error" as const,
      errorMessage: "Audit failed to run",
    };
    const { container } = render(<ScoreDisplay audit={audit} />);
    expect(container.firstChild).toMatchSnapshot();
  });

  it("renders metricSavings fallback with displayValue", () => {
    const audit = {
      id: "test",
      title: "Test",
      score: 0.5,
      scoreDisplayMode: "metricSavings" as const,
      displayValue: "150 ms",
    };
    const { container } = render(<ScoreDisplay audit={audit} device="Mobile" />);
    expect(container.firstChild).toMatchSnapshot();
  });

  it("renders metricSavings fallback without displayValue", () => {
    const audit = {
      id: "test",
      title: "Test",
      score: 0.75,
      scoreDisplayMode: "metricSavings" as const,
    };
    const { container } = render(<ScoreDisplay audit={audit} />);
    expect(container.firstChild).toMatchSnapshot();
  });

  it("renders metricSavings fallback with device but no displayValue", () => {
    const audit = {
      id: "test",
      title: "Test",
      score: 0.6,
      scoreDisplayMode: "metricSavings" as const,
    };
    const { container } = render(<ScoreDisplay audit={audit} device="Desktop" />);
    expect(container.firstChild).toMatchSnapshot();
  });
});

describe("isEmptyResult", () => {
  it("returns true for null", () => {
    expect(isEmptyResult(null)).toBe(true);
  });

  it("returns true for undefined", () => {
    expect(isEmptyResult(undefined)).toBe(true);
  });

  it("returns true for table with empty items", () => {
    expect(
      isEmptyResult({
        details: { type: "table", items: [] },
      } as any),
    ).toBe(true);
  });

  it("returns true for opportunity with empty items", () => {
    expect(
      isEmptyResult({
        details: { type: "opportunity", items: [] },
      } as any),
    ).toBe(true);
  });

  it("returns true when details is undefined", () => {
    expect(isEmptyResult({ id: "test" } as any)).toBe(true);
  });

  it("returns false when table has items", () => {
    expect(
      isEmptyResult({
        details: { type: "table", items: [{ url: "x" }] },
      } as any),
    ).toBe(false);
  });
});

describe("sortByScoreDisplayModes", () => {
  it("returns -1 when a is undefined", () => {
    expect(sortByScoreDisplayModes(undefined, { scoreDisplayMode: "numeric" } as any)).toBe(-1);
  });

  it("returns -1 when b is undefined", () => {
    expect(sortByScoreDisplayModes({ scoreDisplayMode: "numeric" } as any, undefined)).toBe(-1);
  });

  it("sorts by score when same display mode", () => {
    const a = { scoreDisplayMode: "numeric" as const, score: 0.5 };
    const b = { scoreDisplayMode: "numeric" as const, score: 0.9 };
    expect(sortByScoreDisplayModes(a as any, b as any)).toBeLessThan(0);
    expect(sortByScoreDisplayModes(b as any, a as any)).toBeGreaterThan(0);
  });

  it("sorts by display mode ranking", () => {
    const metricSavings = { scoreDisplayMode: "metricSavings" as const, score: 0 };
    const numeric = { scoreDisplayMode: "numeric" as const, score: 1 };
    expect(sortByScoreDisplayModes(metricSavings as any, numeric as any)).toBeLessThan(0);
  });
});
