import { render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { IssuesFoundTableCell } from "@/features/page-speed-insights/RecommendationsSection/IssuesFoundTableCell";
import type { TableColumnHeading, TableItem } from "@/lib/schema";

vi.mock("@/features/page-speed-insights/lh-categories/table/RenderTableValue", () => ({
  RenderTableValue: ({
    value,
    heading,
    device,
  }: {
    value: unknown;
    heading: TableColumnHeading;
    device: string;
  }) => (
    <span data-testid="render-value" data-value={String(value)} data-device={device}>
      {String(value)}
    </span>
  ),
}));

const baseHeading: TableColumnHeading = {
  key: "url",
  label: "URL",
  valueType: "url",
};

describe("IssuesFoundTableCell", () => {
  it("renders value when no subItems", () => {
    const { container } = render(
      <IssuesFoundTableCell value="https://example.com" heading={baseHeading} device="Mobile" />,
    );
    expect(container.querySelector('[data-testid="render-value"]')).toBeTruthy();
    expect(container.textContent).toContain("https://example.com");
  });

  it("renders value and subItems when subItems present", () => {
    const heading: TableColumnHeading = {
      ...baseHeading,
      subItemsHeading: { key: "url", valueType: "url" },
    };
    const subItems: TableItem[] = [
      { url: "https://a.com/1.js" } as TableItem,
      { url: "https://b.com/2.js" } as TableItem,
    ];
    const { container } = render(
      <IssuesFoundTableCell
        value="https://example.com"
        subItems={{ type: "subitems", items: subItems }}
        heading={heading}
        device="Desktop"
      />,
    );
    expect(container.querySelector("ul")).toBeTruthy();
    expect(container.querySelectorAll("li")).toHaveLength(2);
  });

  it("uses heading as subHeading when subItemsHeading missing", () => {
    const subItems: TableItem[] = [{ url: "https://x.com" } as TableItem];
    const { container } = render(
      <IssuesFoundTableCell
        value="main"
        subItems={{ type: "subitems", items: subItems }}
        heading={baseHeading}
        device="Mobile"
      />,
    );
    expect(container.querySelector("ul")).toBeTruthy();
  });
});
