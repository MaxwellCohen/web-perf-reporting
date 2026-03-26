import { describe, expect, it } from "vitest";
import { LH_AUDIT_TABLE_COLUMNS } from "@/features/page-speed-insights/tsTable/lhAuditTableColumns";

describe("LH_AUDIT_TABLE_COLUMNS", () => {
  it("exports stable column ids including auditTitle for dashboard filters", () => {
    const ids = LH_AUDIT_TABLE_COLUMNS.map((c) => c.id).filter(Boolean);
    expect(ids).toContain("category_title");
    expect(ids).toContain("category_score");
    expect(ids).toContain("auditTitle");
    expect(ids).toContain("auditGroup");
    expect(ids).toContain("auditDescription");
    expect(ids).toContain("auditScore");
    expect(ids).not.toContain(undefined);
  });

  it("has a single Audit Group column", () => {
    const groupCols = LH_AUDIT_TABLE_COLUMNS.filter((c) => c.id === "auditGroup");
    expect(groupCols).toHaveLength(1);
  });
});
