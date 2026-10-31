import { describe, expect, it } from "vitest";
import { prefixPsiReportLabels, resolvePsiRunLabels } from "@/lib/viewer/psiCompareLabels";

describe("resolvePsiRunLabels", () => {
  it("defaults to A and B", () => {
    expect(resolvePsiRunLabels()).toEqual(["A", "B"]);
    expect(resolvePsiRunLabels("", "  ")).toEqual(["A", "B"]);
  });

  it("keeps custom labels", () => {
    expect(resolvePsiRunLabels("Before", "After")).toEqual(["Before", "After"]);
  });

  it("disambiguates identical labels", () => {
    expect(resolvePsiRunLabels("Run", "Run")).toEqual(["Run", "Run (2)"]);
  });
});

describe("prefixPsiReportLabels", () => {
  it("prefixes form-factor labels with the run name", () => {
    expect(prefixPsiReportLabels(["Mobile", "Desktop"], "Before")).toEqual([
      "Before · Mobile",
      "Before · Desktop",
    ]);
  });
});
