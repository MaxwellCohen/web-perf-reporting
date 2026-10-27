import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";
import { AuditSeverityFindingsViz } from "./AuditSeverityFindingsViz";
import type { DetailTableItem } from "@/features/page-speed-insights/lh-categories/table/detailTableShared";

function row(items: Array<Record<string, unknown>>, label = "Mobile"): DetailTableItem {
  return {
    _userLabel: label,
    auditResult: {
      id: "has-hsts",
      details: { type: "table", headings: [], items: items as never },
    },
  };
}

describe("AuditSeverityFindingsViz", () => {
  it("renders severity badges and descriptions", () => {
    const { container } = render(
      <AuditSeverityFindingsViz
        rows={[
          row([
            { description: "No HSTS header found", severity: "High" },
            {
              description: "`max-age` is too low",
              directive: "max-age",
              severity: "Medium",
            },
          ]),
        ]}
      />,
    );

    expect(container.textContent).toContain("No HSTS header found");
    expect(container.textContent).toContain("High");
    expect(container.textContent).toContain("max-age");
    expect(container.textContent).toContain("Medium");
  });

  it("returns null when there are no findings", () => {
    const { container } = render(<AuditSeverityFindingsViz rows={[row([])]} />);
    expect(container.firstChild).toBeNull();
  });
});
