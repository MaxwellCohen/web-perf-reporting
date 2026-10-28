import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";
import { AuditNodeFindingsViz, isNodeFindingsAudit, parseContrast } from "./AuditNodeFindingsViz";
import { makeRow } from "./qualityVizTestUtils";

const node = (selector: string, explanation = "Fix any of the following:\n  Heading order invalid") => ({
  node: { type: "node", snippet: `<h3 class="${selector}">`, selector, nodeLabel: "Label", explanation },
});

describe("AuditNodeFindingsViz", () => {
  it("shows failing element count for one report", () => {
    const { container } = render(<AuditNodeFindingsViz rows={[makeRow("heading-order", [node("h3.a")])]} />);
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

  it("renders contrast swatches", () => {
    const explanation =
      "Fix any of the following:\n  Element has insufficient color contrast of 2.5 (foreground color: #aaaaaa, background color: #ffffff, font size: 12.0pt (16px), font weight: normal). Expected contrast ratio of 4.5:1";
    expect(parseContrast(explanation)).toMatchObject({ ratio: 2.5, fg: "#aaaaaa", bg: "#ffffff", expected: "4.5:1" });
    const { container } = render(<AuditNodeFindingsViz rows={[makeRow("color-contrast", [node("p.x", explanation)])]} />);
    expect(container.textContent).toContain("2.5:1");
    expect(container.querySelector('[aria-label="Foreground #aaaaaa"]')).not.toBeNull();
  });

  it("predicate rejects empty, non-node and handled audits", () => {
    expect(isNodeFindingsAudit([makeRow("heading-order", [])])).toBe(false);
    expect(isNodeFindingsAudit([makeRow("heading-order", [{ url: "x" }])])).toBe(false);
    expect(isNodeFindingsAudit([makeRow("dom-size", [node("a")])])).toBe(false);
    expect(isNodeFindingsAudit([makeRow("image-alt", [node("img")])])).toBe(true);
    expect(render(<AuditNodeFindingsViz rows={[makeRow("image-alt", [])]} />).container.firstChild).toBeNull();
  });
});
