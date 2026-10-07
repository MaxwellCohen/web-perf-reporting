import { describe, expect, it } from "vitest";
import type { AuditDetailList, AuditResultsRecord } from "@/lib/schema";
import { collectLcpElements } from "@/features/page-speed-insights/lcpElement";

const lcpNode = {
  type: "node" as const,
  lhId: "page-0-H1",
  nodeLabel: "Hero headline",
  snippet: "<h1>",
  selector: "h1",
};

describe("collectLcpElements", () => {
  it("reads the node item from each report's LCP breakdown", () => {
    const mobile: AuditResultsRecord = {
      "lcp-breakdown-insight": {
        id: "lcp-breakdown-insight",
        title: "LCP breakdown",
        score: 1,
        scoreDisplayMode: "informative",
        details: {
          type: "list",
          items: [
            { type: "table", headings: [], items: [] },
            lcpNode,
          ] as unknown as AuditDetailList["items"],
        },
      },
    };
    const desktop: AuditResultsRecord = {
      "lcp-breakdown-insight": {
        id: "lcp-breakdown-insight",
        title: "LCP breakdown",
        score: 1,
        scoreDisplayMode: "informative",
        details: {
          type: "list",
          items: [{ ...lcpNode, nodeLabel: "Desktop hero", lhId: "page-1-IMG" }] as unknown as AuditDetailList["items"],
        },
      },
    };

    expect(
      collectLcpElements([
        { audits: mobile, label: "Mobile" },
        { audits: desktop, label: "Desktop" },
      ]),
    ).toEqual([
      { label: "Mobile", node: lcpNode },
      { label: "Desktop", node: { ...lcpNode, nodeLabel: "Desktop hero", lhId: "page-1-IMG" } },
    ]);
  });

  it("returns nothing when the breakdown has no element node", () => {
    const audits: AuditResultsRecord = {
      "lcp-breakdown-insight": {
        id: "lcp-breakdown-insight",
        title: "LCP breakdown",
        score: 1,
        scoreDisplayMode: "informative",
        details: { type: "table", headings: [], items: [{ label: "Time to first byte" }] },
      },
    };

    expect(collectLcpElements([{ audits, label: "Mobile" }])).toEqual([]);
  });
});
