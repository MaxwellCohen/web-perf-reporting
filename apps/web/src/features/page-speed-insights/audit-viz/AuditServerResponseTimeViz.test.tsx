import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";
import { AuditServerResponseTimeViz } from "./AuditServerResponseTimeViz";
import { makeRow } from "./performanceVizTestUtils";

describe("AuditServerResponseTimeViz", () => {
  it("shows a good single report without label", () => {
    const { container } = render(
      <AuditServerResponseTimeViz
        rows={[makeRow("server-response-time", [{ url: "https://a.com", responseTime: 30 }])]}
      />,
    );
    expect(container.textContent).toContain("30 ms · Good");
    expect(container.textContent).not.toContain("Mobile");
  });

  it("colors slow reports and handles a missing report", () => {
    const { container } = render(
      <AuditServerResponseTimeViz
        rows={[
          makeRow("server-response-time", [{ url: "https://a.com", responseTime: 900 }], "Mobile"),
          makeRow("server-response-time", [], "Desktop"),
        ]}
      />,
    );
    expect(container.textContent).toContain("900 ms · Slow");
    expect(container.textContent).toContain("Desktop");
    expect(container.textContent).toContain("No data");
    expect(container.querySelectorAll('[data-testid="server-response-row"]').length).toBe(2);
  });

  it("returns null when empty", () => {
    const { container } = render(
      <AuditServerResponseTimeViz rows={[makeRow("server-response-time", [])]} />,
    );
    expect(container.firstChild).toBeNull();
  });
});
