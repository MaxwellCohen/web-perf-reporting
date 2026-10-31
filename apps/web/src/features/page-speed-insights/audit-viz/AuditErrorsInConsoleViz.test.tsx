import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";
import { AuditErrorsInConsoleViz } from "./AuditErrorsInConsoleViz";
import { makeRow } from "./qualityVizTestUtils";

const err = (url: string, description = "Failed to load resource: 404") => ({
  source: "network",
  description,
  sourceLocation: { type: "source-location", url, line: 0, column: 0 },
});

describe("AuditErrorsInConsoleViz", () => {
  it("renders one report without labels", () => {
    const { container } = render(
      <AuditErrorsInConsoleViz
        rows={[
          makeRow("errors-in-console", [err("https://a.com/x.js"), err("https://b.com/y.js")]),
        ]}
      />,
    );
    expect(container.textContent).toContain("1 unique message");
    expect(container.textContent).toContain("×2");
    expect(container.textContent).not.toContain("Mobile, Desktop");
  });

  it("attributes messages across reports", () => {
    const { container } = render(
      <AuditErrorsInConsoleViz
        rows={[
          makeRow("errors-in-console", [err("https://a.com/x.js")], "Mobile"),
          makeRow(
            "errors-in-console",
            [err("https://a.com/x.js"), err("https://a.com/z.js", "Boom")],
            "Desktop",
          ),
        ]}
      />,
    );
    expect(container.textContent).toContain("2 unique messages");
    expect(container.textContent).toContain("Mobile, Desktop");
  });

  it("handles empty and missing reports", () => {
    expect(
      render(
        <AuditErrorsInConsoleViz
          rows={[makeRow("errors-in-console", []), makeRow("errors-in-console", [], "Desktop")]}
        />,
      ).container.firstChild,
    ).toBeNull();
    const { container } = render(
      <AuditErrorsInConsoleViz
        rows={[
          makeRow("errors-in-console", []),
          makeRow("errors-in-console", [err("https://a.com/x.js")], "Desktop"),
        ]}
      />,
    );
    expect(container.textContent).toContain("1 unique message");
  });
});
