import { render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("lucide-react", () => ({
  Check: () => null,
  X: () => null,
}));

import { ScoreDisplay, isEmptyResult } from "@/features/page-speed-insights/ScoreDisplay";

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

describe("ScoreDisplay badges", () => {
  const base = { id: "a", title: "A" } as const;

  it("shows a green badge for a pass without a label", () => {
    const { container } = render(
      <ScoreDisplay audit={{ ...base, score: 1, scoreDisplayMode: "numeric" }} />,
    );
    const el = container.querySelector("[data-status]");
    expect(el?.getAttribute("data-status")).toBe("pass");
    expect(el?.textContent).toContain("Pass");
  });

  it("shows amber/red badges, the label, and displayValue when a device is given", () => {
    const { container } = render(
      <>
        <ScoreDisplay
          audit={{
            ...base,
            score: 0.6,
            scoreDisplayMode: "metricSavings",
            displayValue: "Est savings of 462 KiB",
          }}
          device="Mobile"
        />
        <ScoreDisplay audit={{ ...base, score: 0, scoreDisplayMode: "binary" }} device="Desktop" />
      </>,
    );
    const els = container.querySelectorAll("[data-status]");
    expect(els[0].getAttribute("data-status")).toBe("average");
    expect(els[0].textContent).toContain("Mobile:");
    expect(els[0].textContent).toContain("Est savings of 462 KiB");
    expect(els[1].getAttribute("data-status")).toBe("fail");
    expect(els[1].textContent).toContain("Desktop:");
  });

  it("shows the error message", () => {
    const { container } = render(
      <ScoreDisplay
        audit={{ ...base, score: null, scoreDisplayMode: "error", errorMessage: "Boom" }}
      />,
    );
    expect(container.textContent).toContain("Boom");
  });
});
