import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";
import type { DetailTableItem } from "@/features/page-speed-insights/lh-categories/table/detailTableShared";
import { AuditInpPhaseViz } from "./AuditLcpInpPhaseViz";

describe("AuditInpPhaseViz", () => {
  it("reads phases from the Lighthouse list [table, node] shape", () => {
    const rows = [
      {
        _userLabel: "Mobile",
        auditResult: {
          id: "inp-breakdown-insight",
          details: {
            type: "list",
            items: [
              {
                type: "table",
                headings: [],
                items: [
                  { subpart: "inputDelay", label: "Input delay", duration: 12 },
                  { subpart: "processingDuration", label: "Processing duration", duration: 40 },
                  { subpart: "presentationDelay", label: "Presentation delay", duration: 8 },
                ],
              },
              { type: "node", selector: "button" },
            ],
          },
        },
      },
    ] as unknown as DetailTableItem[];
    const { container } = render(<AuditInpPhaseViz rows={rows} />);
    expect(container.textContent).toContain("INP phases");
  });
});
