import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";
import { AuditThirdPartyCookiesViz } from "./AuditThirdPartyCookiesViz";
import { makeRow } from "./qualityVizTestUtils";

const yt = "https://www.youtube.com/embed/x";

describe("AuditThirdPartyCookiesViz", () => {
  it("groups cookies by origin for one report", () => {
    const { container } = render(
      <AuditThirdPartyCookiesViz
        rows={[makeRow("third-party-cookies", [{ url: yt, name: "YSC" }, { url: yt, name: "VISITOR" }])]}
      />,
    );
    expect(container.textContent).toContain("1 third-party origin");
    expect(container.textContent).toContain("2 cookies");
    expect(container.textContent).toContain("YSC");
    expect(container.textContent).not.toContain("Mobile");
  });

  it("attributes origins across reports", () => {
    const { container } = render(
      <AuditThirdPartyCookiesViz
        rows={[
          makeRow("third-party-cookies", [{ url: yt, name: "YSC" }], "Mobile"),
          makeRow("third-party-cookies", [{ url: yt, name: "YSC" }, { url: "https://ads.io/a", name: "id" }], "Desktop"),
        ]}
      />,
    );
    expect(container.textContent).toContain("2 third-party origins");
    expect(container.textContent).toContain("Mobile, Desktop");
  });

  it("returns null when empty", () => {
    expect(render(<AuditThirdPartyCookiesViz rows={[makeRow("third-party-cookies", [])]} />).container.firstChild).toBeNull();
  });
});
