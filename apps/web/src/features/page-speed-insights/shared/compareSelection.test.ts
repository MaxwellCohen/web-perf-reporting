import { describe, expect, it } from "vitest";
import {
  orderCompareLabels,
  resolveCompareSelection,
  toggleCompareSelection,
} from "@/features/page-speed-insights/shared/compareSelection";

describe("resolveCompareSelection", () => {
  it("defaults to the first A/B pair when two runs are loaded", () => {
    expect(
      resolveCompareSelection([], ["A · Mobile", "A · Desktop", "B · Mobile", "B · Desktop"]),
    ).toEqual(["A · Mobile", "B · Mobile"]);
  });

  it("defaults to the first report otherwise", () => {
    expect(resolveCompareSelection([], ["Mobile", "Desktop"])).toEqual(["Mobile"]);
    expect(resolveCompareSelection([], [])).toEqual([]);
  });

  it("keeps known URL labels", () => {
    expect(resolveCompareSelection(["Desktop", "Nope"], ["Mobile", "Desktop"])).toEqual([
      "Desktop",
    ]);
  });
});

describe("toggleCompareSelection", () => {
  it("toggles up to two labels and never empties the selection", () => {
    expect(toggleCompareSelection(["Mobile"], "Mobile")).toEqual(["Mobile"]);
    expect(toggleCompareSelection(["Mobile"], "Desktop")).toEqual(["Mobile", "Desktop"]);
    expect(toggleCompareSelection(["Mobile", "Desktop"], "Tablet")).toEqual([
      "Desktop",
      "Tablet",
    ]);
    expect(toggleCompareSelection(["Mobile", "Desktop"], "Mobile")).toEqual(["Desktop"]);
  });
});

describe("orderCompareLabels", () => {
  it("orders chips A then B per form factor, Mobile first", () => {
    expect(
      orderCompareLabels(["inline · Mobile", "inline · Desktop", "link · Desktop", "link · Mobile"]),
    ).toEqual(["inline · Mobile", "link · Mobile", "inline · Desktop", "link · Desktop"]);
  });

  it("keeps the given order without two runs", () => {
    expect(orderCompareLabels(["Desktop", "Mobile"])).toEqual(["Desktop", "Mobile"]);
  });
});
