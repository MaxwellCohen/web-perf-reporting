import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";
import { AuditLinkTextViz } from "./AuditLinkTextViz";
import { makeRow } from "./qualityVizTestUtils";

const link = (text: string, href: string) => ({ text, href });

describe("AuditLinkTextViz", () => {
  it("groups by text for one report", () => {
    const { container } = render(
      <AuditLinkTextViz
        rows={[makeRow("link-text", [link("Learn More", "https://a.com/1"), link("Learn More", "https://a.com/2")])]}
      />,
    );
    expect(container.textContent).toContain("×2");
    expect(container.textContent).toContain("2 hrefs");
    expect(container.textContent).not.toContain("Mobile");
  });

  it("attributes across reports", () => {
    const { container } = render(
      <AuditLinkTextViz
        rows={[
          makeRow("link-text", [link("Learn More", "https://a.com/1")], "Mobile"),
          makeRow("link-text", [link("Learn More", "https://a.com/1"), link("Click here", "https://a.com/3")], "Desktop"),
        ]}
      />,
    );
    expect(container.textContent).toContain("Mobile, Desktop");
    expect(container.textContent).toContain("Click here");
  });

  it("returns null when empty", () => {
    expect(render(<AuditLinkTextViz rows={[makeRow("link-text", [])]} />).container.firstChild).toBeNull();
  });
});
