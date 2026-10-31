import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";
import { AuditImageIssuesViz } from "./AuditImageIssuesViz";
import { makeRow } from "./performanceVizTestUtils";

const sized = {
  node: { type: "node", nodeLabel: "hero image", snippet: "<img>" },
  url: "https://a.com/hero.png",
  displayedSize: "300 x 200",
  actualSize: "1200 x 800",
  expectedSize: "600 x 400",
};

describe("AuditImageIssuesViz", () => {
  it("renders count and offender detail for one report", () => {
    const { container } = render(
      <AuditImageIssuesViz
        auditId="image-size-responsive"
        rows={[makeRow("image-size-responsive", [sized])]}
      />,
    );
    expect(container.textContent).toContain("Images with wrong resolution");
    expect(container.textContent).toContain("a.com/hero.png");
    expect(container.textContent).toContain("expected 600 x 400");
    expect(container.textContent).not.toContain("Mobile");
  });

  it("renders failure reasons for animations across two reports", () => {
    const anim = {
      node: { type: "node", nodeLabel: "div.spinner" },
      subItems: { type: "subitems", items: [{ failureReason: "Unsupported CSS Property: width" }] },
    };
    const { container } = render(
      <AuditImageIssuesViz
        auditId="non-composited-animations"
        rows={[
          makeRow("non-composited-animations", [anim], "Mobile"),
          makeRow("non-composited-animations", [], "Desktop"),
        ]}
      />,
    );
    expect(container.textContent).toContain("Mobile");
    expect(container.textContent).toContain("Desktop");
    expect(container.textContent).toContain("div.spinner");
    expect(container.textContent).toContain("Unsupported CSS Property: width");
  });

  it("returns null when empty", () => {
    const { container } = render(
      <AuditImageIssuesViz auditId="unsized-images" rows={[makeRow("unsized-images", [])]} />,
    );
    expect(container.firstChild).toBeNull();
  });
});
