import { describe, expect, it } from "vitest";
import {
  getCompareRuns,
  pairByFormFactor,
  parseCompareLabel,
  switchCompareRunLabel,
} from "@/features/page-speed-insights/shared/compareRuns";
import { compareReportLabels } from "@/features/page-speed-insights/shared/reportLabels";

describe("parseCompareLabel", () => {
  it("splits run prefix from form factor", () => {
    expect(parseCompareLabel("A · Mobile")).toEqual({
      label: "A · Mobile",
      run: "A",
      formFactor: "Mobile",
    });
  });

  it("leaves single-run labels alone", () => {
    expect(parseCompareLabel("Mobile")).toEqual({
      label: "Mobile",
      run: null,
      formFactor: "Mobile",
    });
  });
});

describe("getCompareRuns", () => {
  it("detects dual runs with default A/B labels", () => {
    const compare = getCompareRuns([
      { label: "A · Mobile" },
      { label: "A · Desktop" },
      { label: "B · Mobile" },
      { label: "B · Desktop" },
    ]);
    expect(compare.mode).toBe("compare");
    if (compare.mode === "compare") {
      expect(compare.runs).toEqual(["A", "B"]);
    }
  });

  it("detects custom run names", () => {
    const compare = getCompareRuns([
      { label: "Before · Mobile" },
      { label: "After · Mobile" },
    ]);
    expect(compare.mode).toBe("compare");
    if (compare.mode === "compare") {
      expect(compare.runs).toEqual(["Before", "After"]);
    }
  });

  it("stays single when only one run prefix exists", () => {
    expect(getCompareRuns([{ label: "A · Mobile" }, { label: "A · Desktop" }]).mode).toBe(
      "single",
    );
  });
});

describe("pairByFormFactor", () => {
  it("pairs matching form factors across runs", () => {
    const pairs = pairByFormFactor(
      [
        { label: "A · Mobile", id: 1 },
        { label: "B · Mobile", id: 2 },
        { label: "A · Desktop", id: 3 },
      ],
      ["A", "B"],
    );
    expect(pairs).toHaveLength(2);
    expect(pairs[0]?.a?.id).toBe(1);
    expect(pairs[0]?.b?.id).toBe(2);
    expect(pairs[1]?.a?.id).toBe(3);
    expect(pairs[1]?.b).toBeUndefined();
  });
});

describe("switchCompareRunLabel", () => {
  it("keeps form factor when switching runs", () => {
    expect(
      switchCompareRunLabel("Before · Desktop", "After", [
        "Before · Mobile",
        "Before · Desktop",
        "After · Mobile",
        "After · Desktop",
      ]),
    ).toBe("After · Desktop");
  });
});

describe("compareReportLabels with run prefixes", () => {
  it("keeps run-prefixed labels in the order they were added", () => {
    const labels = ["B · Desktop", "A · Mobile", "B · Mobile", "A · Desktop"];
    expect([...labels].sort((a, b) => compareReportLabels(a, b, ["A", "B"]))).toEqual(labels);
  });
});
