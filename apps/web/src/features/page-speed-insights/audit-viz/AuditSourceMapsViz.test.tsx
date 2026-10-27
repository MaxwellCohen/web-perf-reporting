import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";
import type { DetailTableItem } from "@/features/page-speed-insights/lh-categories/table/detailTableShared";
import { AuditSourceMapsViz } from "./AuditSourceMapsViz";

function row(items: Array<Record<string, unknown>>, label = "Mobile"): DetailTableItem {
  return {
    _userLabel: label,
    auditResult: {
      id: "valid-source-maps",
      details: { type: "table", headings: [], items: items as never },
    },
  };
}

const sampleItem = {
  scriptUrl: "https://example.com/app.js",
  sourceMapUrl: "https://example.com/app.js.map",
  subItems: {
    type: "subitems",
    items: [{ error: "Warning: missing 12 items in `.sourcesContent`" }],
  },
};

describe("AuditSourceMapsViz", () => {
  it("renders a compact deduped list", () => {
    const { container } = render(
      <AuditSourceMapsViz
        rows={[
          row([sampleItem], "Mobile"),
          row(
            [
              sampleItem,
              {
                scriptUrl: "https://example.com/vendor.js",
                sourceMapUrl: "https://example.com/vendor.js.map",
                subItems: {
                  type: "subitems",
                  items: [{ error: "Warning: missing 3 items in `.sourcesContent`" }],
                },
              },
            ],
            "Desktop",
          ),
        ]}
      />,
    );

    expect(container.textContent).toContain("2 scripts with source map issues");
    expect(container.textContent).toContain("example.com/app.js");
    expect(container.textContent).toContain("12 missing");
    expect(container.textContent).toContain("Mobile, Desktop");
    expect(container.querySelectorAll("li").length).toBe(2);
  });

  it("returns null with no items", () => {
    const { container } = render(<AuditSourceMapsViz rows={[row([])]} />);
    expect(container.firstChild).toBeNull();
  });
});
