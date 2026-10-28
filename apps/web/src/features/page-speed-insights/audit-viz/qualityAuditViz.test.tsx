import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";
import { QualityAuditViz } from "./qualityAuditViz";
import { makeRow } from "./qualityVizTestUtils";

const node = { node: { type: "node", snippet: "<img>", selector: "img", nodeLabel: "x", explanation: "" } };

describe("QualityAuditViz", () => {
  it("dispatches by id", () => {
    const { container } = render(
      <QualityAuditViz rows={[makeRow("link-text", [{ text: "Learn More", href: "https://a.com" }])]} />,
    );
    expect(container.textContent).toContain("Learn More");
  });

  it("dispatches generic node audits", () => {
    const { container } = render(<QualityAuditViz rows={[makeRow("image-alt", [node])]} />);
    expect(container.textContent).toContain("Failing elements");
  });

  it("ignores handled and unknown audits", () => {
    expect(render(<QualityAuditViz rows={[makeRow("valid-source-maps", [node])]} />).container.firstChild).toBeNull();
    expect(render(<QualityAuditViz rows={[makeRow("csp-xss", [node])]} />).container.firstChild).toBeNull();
    expect(render(<QualityAuditViz rows={[makeRow("something", [{ a: 1 }])]} />).container.firstChild).toBeNull();
    expect(render(<QualityAuditViz rows={[]} />).container.firstChild).toBeNull();
  });
});
