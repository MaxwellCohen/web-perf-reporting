import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";
import { AuditDeprecationsViz } from "./AuditDeprecationsViz";
import { makeRow } from "./qualityVizTestUtils";

const dep = (value: string, url = "https://a.com/app.js") => ({
  value,
  source: { type: "source-location", url, line: 9, column: 1 },
});

describe("AuditDeprecationsViz", () => {
  it("renders one report", () => {
    const { container } = render(
      <AuditDeprecationsViz rows={[makeRow("deprecations", [dep("Foo is deprecated")])]} />,
    );
    expect(container.textContent).toContain("1 deprecated API");
    expect(container.textContent).toContain("a.com/app.js:10");
    expect(container.textContent).not.toContain("Mobile");
  });

  it("dedupes with attribution across reports", () => {
    const { container } = render(
      <AuditDeprecationsViz
        rows={[
          makeRow("deprecations", [dep("Foo is deprecated")], "Mobile"),
          makeRow("deprecations", [dep("Foo is deprecated"), dep("Bar")], "Desktop"),
        ]}
      />,
    );
    expect(container.querySelectorAll("li").length).toBe(2);
    expect(container.textContent).toContain("Mobile, Desktop");
  });

  it("returns null when empty", () => {
    expect(
      render(<AuditDeprecationsViz rows={[makeRow("deprecations", [])]} />).container.firstChild,
    ).toBeNull();
  });
});
