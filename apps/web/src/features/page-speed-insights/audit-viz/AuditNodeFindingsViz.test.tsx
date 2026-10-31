import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";
import { AuditNodeFindingsViz, isNodeFindingsAudit } from "./AuditNodeFindingsViz";
import { makeRow } from "./qualityVizTestUtils";

const node = (
  selector: string,
  explanation = "Fix any of the following:\n  Heading order invalid",
) => ({
  node: {
    type: "node",
    snippet: `<h3 class="${selector}">`,
    selector,
    nodeLabel: "Label",
    explanation,
  },
});

describe("AuditNodeFindingsViz", () => {
  it("shows failing element count for one report", () => {
    const { container } = render(
      <AuditNodeFindingsViz rows={[makeRow("heading-order", [node("h3.a")])]} />,
    );
    expect(container.textContent).toContain("Failing elements");
    expect(container.textContent).toContain("Heading order invalid");
    expect(container.textContent).not.toContain("Mobile");
  });

  it("dedupes elements across reports with attribution", () => {
    const { container } = render(
      <AuditNodeFindingsViz
        rows={[
          makeRow("heading-order", [node("h3.a")], "Mobile"),
          makeRow("heading-order", [node("h3.a"), node("h4.b")], "Desktop"),
        ]}
      />,
    );
    expect(container.querySelectorAll("ul > li").length).toBe(2);
    expect(container.textContent).toContain("Mobile, Desktop");
  });

  it("predicate rejects empty, non-node and handled audits", () => {
    expect(isNodeFindingsAudit([makeRow("heading-order", [])])).toBe(false);
    expect(isNodeFindingsAudit([makeRow("heading-order", [{ url: "x" }])])).toBe(false);
    expect(isNodeFindingsAudit([makeRow("dom-size", [node("a")])])).toBe(false);
    expect(isNodeFindingsAudit([makeRow("image-alt", [node("img")])])).toBe(true);
    expect(
      render(<AuditNodeFindingsViz rows={[makeRow("image-alt", [])]} />).container.firstChild,
    ).toBeNull();
  });
});
