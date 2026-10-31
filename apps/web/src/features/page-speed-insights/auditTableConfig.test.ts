import { describe, expect, it } from "vitest";
import { shouldShowSeparateTablesPerReport } from "@/features/page-speed-insights/auditTableConfig";

describe("auditTableConfig", () => {

  it("returns true for audit IDs in the list", () => {
    expect(shouldShowSeparateTablesPerReport("dom-size-insight")).toBe(true);
    expect(shouldShowSeparateTablesPerReport("network-requests")).toBe(true);
    expect(shouldShowSeparateTablesPerReport("resource-summary")).toBe(true);
  });

  it("returns false for audit IDs not in the list", () => {
    expect(shouldShowSeparateTablesPerReport("unknown-audit")).toBe(false);
    expect(shouldShowSeparateTablesPerReport("first-contentful-paint")).toBe(false);
    expect(shouldShowSeparateTablesPerReport("lcp-breakdown-insight")).toBe(false);
  });
});
