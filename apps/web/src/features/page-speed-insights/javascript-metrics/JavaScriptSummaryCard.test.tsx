import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { JavaScriptSummaryCard } from "@/features/page-speed-insights/javascript-metrics/JavaScriptSummaryCard";

describe("JavaScriptSummaryCard", () => {
  it("returns null when no stats have totalScripts > 0", () => {
    const { container } = render(
      <JavaScriptSummaryCard
        stats={[{ label: "Mobile", totalScripts: 0, totalTransferSize: 0, totalResourceSize: 0 }]}
      />,
    );
    expect(container.firstChild).toBeNull();
  });

  it("renders table with single report (no Report column)", () => {
    const { container } = render(
      <JavaScriptSummaryCard
        stats={[
          { label: "Mobile", totalScripts: 5, totalTransferSize: 1000, totalResourceSize: 2000 },
        ]}
      />,
    );
    expect(container.firstChild).toMatchSnapshot();
  });

  it("renders Report column when multiple reports", () => {
    const { container } = render(
      <JavaScriptSummaryCard
        stats={[
          { label: "Mobile", totalScripts: 3, totalTransferSize: 500, totalResourceSize: 600 },
          { label: "Desktop", totalScripts: 4, totalTransferSize: 700, totalResourceSize: 800 },
        ]}
      />,
    );
    expect(container.firstChild).toMatchSnapshot();
  });
});
