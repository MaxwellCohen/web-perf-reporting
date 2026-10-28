import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";
import { AuditViewportViz, viewportContentFromSnippet } from "./AuditViewportViz";
import { makeRow } from "./performanceVizTestUtils";

const node = (content: string) => ({
  node: { type: "node", snippet: `<meta name="viewport" content="${content}">` },
});

describe("AuditViewportViz", () => {
  it("parses content from snippet", () => {
    expect(viewportContentFromSnippet('<meta name="viewport" content="width=device-width">')).toBe(
      "width=device-width",
    );
    expect(viewportContentFromSnippet(undefined)).toBeUndefined();
  });

  it("renders one report", () => {
    const { container } = render(
      <AuditViewportViz rows={[makeRow("viewport-insight", [node("width=device-width")])]} />,
    );
    expect(container.textContent).toContain("Viewport meta tag");
    expect(container.textContent).toContain("width=device-width");
    expect(container.textContent).not.toContain("Mobile");
  });

  it("renders two reports and a missing one", () => {
    const { container } = render(
      <AuditViewportViz
        rows={[
          makeRow("viewport-insight", [node("width=device-width, initial-scale=1")], "Mobile"),
          makeRow("viewport-insight", [], "Desktop"),
        ]}
      />,
    );
    expect(container.textContent).toContain("Mobile");
    expect(container.textContent).toContain("No viewport meta tag");
  });

  it("returns null when empty", () => {
    const { container } = render(<AuditViewportViz rows={[makeRow("viewport-insight", [])]} />);
    expect(container.firstChild).toBeNull();
  });
});
