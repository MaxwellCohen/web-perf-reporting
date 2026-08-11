import { render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import {
  LegacyJavaScriptCard,
  UnminifiedJavaScriptCard,
  UnusedJavaScriptCard,
} from "@/features/page-speed-insights/javascript-metrics/JavascriptAuditBytesCards";

vi.mock("@/features/page-speed-insights/shared/TableCard", () => ({
  TableCard: ({ title }: { title: string }) => <div data-testid="table-card">{title}</div>,
}));

describe("JavascriptAuditBytesCards", () => {
  it("LegacyJavaScriptCard returns null without items", () => {
    const { container } = render(
      <LegacyJavaScriptCard
        metrics={[
          { label: "Mobile", legacyJS: [] },
          { label: "Desktop", legacyJS: [] },
        ]}
      />,
    );
    expect(container.firstChild).toBeNull();
  });

  it("LegacyJavaScriptCard renders TableCard when data present", () => {
    const { container } = render(
      <LegacyJavaScriptCard
        metrics={[
          {
            label: "Mobile",
            legacyJS: [{ url: "https://example.com/script.js", wastedBytes: 1000, totalBytes: 2000 }],
          },
        ]}
      />,
    );
    expect(container.querySelector('[data-testid="table-card"]')).toBeTruthy();
    expect(container.textContent).toContain("Legacy JavaScript");
  });

  it("UnminifiedJavaScriptCard returns null without items", () => {
    const { container } = render(
      <UnminifiedJavaScriptCard
        metrics={[
          { label: "Mobile", unminifiedJS: [] },
          { label: "Desktop", unminifiedJS: [] },
        ]}
      />,
    );
    expect(container.firstChild).toBeNull();
  });

  it("UnminifiedJavaScriptCard renders TableCard when data present", () => {
    const { container } = render(
      <UnminifiedJavaScriptCard
        metrics={[
          {
            label: "Mobile",
            unminifiedJS: [
              { url: "https://example.com/app.js", wastedBytes: 5000, totalBytes: 10000 },
            ] as never,
          },
        ]}
      />,
    );
    expect(container.querySelector('[data-testid="table-card"]')).toBeTruthy();
    expect(container.textContent).toContain("Unminified JavaScript");
  });

  it("UnusedJavaScriptCard returns null without items", () => {
    const { container } = render(
      <UnusedJavaScriptCard
        metrics={[
          { label: "Mobile", unusedJS: [] },
          { label: "Desktop", unusedJS: [] },
        ]}
      />,
    );
    expect(container.firstChild).toBeNull();
  });

  it("UnusedJavaScriptCard renders TableCard when data present", () => {
    const { container } = render(
      <UnusedJavaScriptCard
        metrics={[
          {
            label: "Mobile",
            unusedJS: [
              {
                url: "https://example.com/script.js",
                wastedBytes: 500,
                totalBytes: 1000,
                wastedPercent: 50,
              },
            ],
          },
        ]}
      />,
    );
    expect(container.querySelector('[data-testid="table-card"]')).toBeTruthy();
    expect(container.textContent).toContain("Unused JavaScript");
  });
});
