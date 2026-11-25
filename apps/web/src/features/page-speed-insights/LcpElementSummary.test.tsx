import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { LcpElementSummary } from "@/features/page-speed-insights/LcpElementSummary";

vi.mock("@/features/page-speed-insights/lh-categories/table/RenderNode", () => ({
  RenderNodeImage: ({ device }: { device: string }) => <div data-testid="node-image">{device}</div>,
}));

const node = {
  type: "node" as const,
  lhId: "page-0-H1",
  nodeLabel: "The React Framework for the Web",
  snippet: '<h1 class="text-heading-40">',
  boundingRect: { top: 0, left: 0, right: 320.4, bottom: 80, width: 320.4, height: 80 },
};

describe("LcpElementSummary", () => {
  it("shows the LCP time, text, HTML and size beside the element screenshot", () => {
    render(<LcpElementSummary elements={[{ label: "Mobile", node, lcpMs: 1740 }]} />);

    expect(screen.getByTestId("node-image")).toHaveTextContent("Mobile");
    expect(screen.getByText("Largest Contentful Paint").nextSibling).toHaveTextContent("1.74 s");
    expect(screen.getByText("The React Framework for the Web")).toBeInTheDocument();
    expect(screen.getByText('<h1 class="text-heading-40">')).toBeInTheDocument();
    expect(screen.getByText("Size on screen").nextSibling).toHaveTextContent("320 × 80 px");
  });

  it("leaves out facts the report does not have", () => {
    render(<LcpElementSummary elements={[{ label: "Mobile", node: { type: "node" } }]} />);

    expect(screen.queryByText("Largest Contentful Paint")).toBeNull();
    expect(screen.queryByText("HTML")).toBeNull();
    expect(screen.queryByText("Size on screen")).toBeNull();
  });

  it("labels each report when there is more than one", () => {
    render(
      <LcpElementSummary
        elements={[
          { label: "Mobile", node },
          { label: "Desktop", node: { ...node, lhId: "page-1-H1" } },
        ]}
      />,
    );

    expect(screen.getAllByText(/^(Mobile|Desktop)$/, { selector: "span" })).toHaveLength(2);
  });
});
