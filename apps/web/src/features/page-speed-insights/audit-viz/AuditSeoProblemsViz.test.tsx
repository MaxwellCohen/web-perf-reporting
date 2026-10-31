import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";
import { AuditSeoProblemsViz } from "./AuditSeoProblemsViz";
import { makeRow } from "./qualityVizTestUtils";

const robots = { index: "3", line: "Disalow: /", message: "Syntax not understood" };
const hreflang = {
  source: "headers",
  subItems: { type: "subitems", items: [{ reason: "Invalid hreflang code" }] },
};

describe("AuditSeoProblemsViz", () => {
  it("lists robots.txt problems for one report", () => {
    const { container } = render(<AuditSeoProblemsViz rows={[makeRow("robots-txt", [robots])]} />);
    expect(container.textContent).toContain("1 problem found");
    expect(container.textContent).toContain("Syntax not understood");
    expect(container.textContent).toContain("line 3: Disalow: /");
    expect(container.textContent).not.toContain("Mobile");
  });

  it("attributes hreflang problems across reports", () => {
    const { container } = render(
      <AuditSeoProblemsViz
        rows={[
          makeRow("hreflang", [hreflang], "Mobile"),
          makeRow("hreflang", [hreflang], "Desktop"),
        ]}
      />,
    );
    expect(container.textContent).toContain("Invalid hreflang code");
    expect(container.textContent).toContain("Mobile, Desktop");
  });

  it("returns null when empty", () => {
    expect(
      render(
        <AuditSeoProblemsViz rows={[makeRow("canonical", []), makeRow("canonical", [], "D")]} />,
      ).container.firstChild,
    ).toBeNull();
  });
});
