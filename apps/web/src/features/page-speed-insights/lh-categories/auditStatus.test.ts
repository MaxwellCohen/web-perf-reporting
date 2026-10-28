import { describe, expect, it } from "vitest";
import type { AuditResultsRecord } from "@/lib/schema";
import {
  formatCategorySummary,
  getAuditStatus,
  getDisagreementText,
  getWorstAuditStatus,
  partitionByStatus,
} from "@/features/page-speed-insights/lh-categories/auditStatus";

type Audit = AuditResultsRecord[string];
const audit = (
  scoreDisplayMode: Audit["scoreDisplayMode"],
  score: number | null,
): Audit => ({ id: "a", title: "A", score, scoreDisplayMode }) as Audit;

describe("getAuditStatus", () => {
  it("uses Lighthouse thresholds for scored audits", () => {
    expect(getAuditStatus(audit("numeric", 0.9))).toBe("pass");
    expect(getAuditStatus(audit("numeric", 0.89))).toBe("average");
    expect(getAuditStatus(audit("numeric", 0.5))).toBe("average");
    expect(getAuditStatus(audit("numeric", 0.49))).toBe("fail");
    expect(getAuditStatus(audit("binary", 0))).toBe("fail");
    expect(getAuditStatus(audit("binary", 1))).toBe("pass");
  });

  it("maps metricSavings scores", () => {
    expect(getAuditStatus(audit("metricSavings", 1))).toBe("pass");
    expect(getAuditStatus(audit("metricSavings", 0.5))).toBe("average");
    expect(getAuditStatus(audit("metricSavings", 0))).toBe("fail");
  });

  it("maps unscored modes and missing audits", () => {
    expect(getAuditStatus(audit("informative", null))).toBe("informative");
    expect(getAuditStatus(audit("manual", null))).toBe("manual");
    expect(getAuditStatus(audit("notApplicable", null))).toBe("notApplicable");
    expect(getAuditStatus(audit("error", null))).toBe("error");
    expect(getAuditStatus(undefined)).toBeNull();
    expect(getAuditStatus({} as Audit)).toBeNull();
  });
});

describe("getWorstAuditStatus", () => {
  it("returns the status for a single report", () => {
    expect(getWorstAuditStatus([audit("numeric", 0.95)])).toBe("pass");
  });
  it("picks the worst across reports", () => {
    expect(getWorstAuditStatus([audit("numeric", 0.95), audit("numeric", 0.2)])).toBe("fail");
    expect(getWorstAuditStatus([audit("numeric", 0.95), audit("notApplicable", null)])).toBe(
      "pass",
    );
    expect(getWorstAuditStatus([null, audit("numeric", 0.6)])).toBe("average");
    expect(getWorstAuditStatus([null, undefined])).toBeNull();
  });
});

describe("getDisagreementText", () => {
  it("is null for a single report", () => {
    expect(getDisagreementText([audit("numeric", 0.1)], ["Mobile"])).toBeNull();
  });
  it("is null when reports agree", () => {
    expect(
      getDisagreementText([audit("numeric", 0.1), audit("binary", 0)], ["Mobile", "Desktop"]),
    ).toBeNull();
  });
  it("names the failing report", () => {
    expect(
      getDisagreementText([audit("numeric", 0.1), audit("numeric", 1)], ["Mobile", "Desktop"]),
    ).toBe("Fails on Mobile only");
    expect(
      getDisagreementText([audit("numeric", 1), audit("numeric", 0.6)], ["Mobile", "Desktop"]),
    ).toBe("Needs attention on Desktop only");
  });
  it("falls back to a generic message", () => {
    expect(
      getDisagreementText([audit("numeric", 0.1), audit("numeric", 0.6)], ["Mobile", "Desktop"]),
    ).toBe("Fails on Mobile only");
    expect(
      getDisagreementText([audit("numeric", 1), audit("informative", null)], ["Mobile", "Desktop"]),
    ).toBe("Differs across reports");
  });
});

describe("partitionByStatus", () => {
  const items = [
    { id: "p", audits: [audit("numeric", 1)] },
    { id: "f", audits: [audit("numeric", 0)] },
    { id: "m", audits: [audit("numeric", 1), audit("numeric", 0.3)] },
    { id: "a", audits: [audit("numeric", 0.6)] },
    { id: "f2", audits: [audit("binary", 0)] },
    { id: "n", audits: [audit("notApplicable", null)] },
  ];

  it("orders sections and keeps item order (single report)", () => {
    const sections = partitionByStatus(items.slice(0, 2), (i) => i.audits);
    expect(sections.map((s) => s.title)).toEqual(["Failed", "Passed"]);
    expect(sections[0].defaultOpen).toBe(true);
    expect(sections[1].defaultOpen).toBe(false);
  });

  it("uses worst status across reports", () => {
    const sections = partitionByStatus(items, (i) => i.audits);
    expect(sections.map((s) => [s.title, s.items.map((i) => i.id)])).toEqual([
      ["Failed", ["f", "m", "f2"]],
      ["Needs attention", ["a"]],
      ["Passed", ["p"]],
      ["Not applicable", ["n"]],
    ]);
    expect(sections.find((s) => s.status === "notApplicable")?.defaultOpen).toBe(false);
    expect(formatCategorySummary(sections)).toBe("3 failed · 1 needs attention · 1 passed");
  });
});
