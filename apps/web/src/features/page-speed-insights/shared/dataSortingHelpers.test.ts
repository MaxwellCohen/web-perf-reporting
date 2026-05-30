import { describe, expect, it } from "vitest";
import {
  sortByMaxValue,
  sortByMaxValueComposite,
} from "@/features/page-speed-insights/shared/dataSortingHelpers";

describe("sortByMaxValue", () => {
  it("returns data unchanged when numReports <= 1", () => {
    const data = [
      { id: "a", val: 10 },
      { id: "b", val: 20 },
    ];
    const result = sortByMaxValue(
      data,
      (d) => d.id,
      (d) => d.val,
      1,
    );
    expect(result).toBe(data);
  });

  it("sorts by max value per key across reports", () => {
    const data = [
      { id: "a", val: 10 },
      { id: "b", val: 5 },
      { id: "a", val: 30 },
      { id: "b", val: 25 },
    ];
    const result = sortByMaxValue(
      data,
      (d) => d.id,
      (d) => d.val,
      2,
    );
    expect(result.map((d) => d.id)).toEqual(["a", "a", "b", "b"]);
  });

  it("treats zero and falsy values correctly", () => {
    const data = [
      { id: "x", val: 0 },
      { id: "y", val: 100 },
    ];
    const result = sortByMaxValue(
      data,
      (d) => d.id,
      (d) => d.val,
      2,
    );
    expect(result[0]?.id).toBe("y");
  });
});

describe("sortByMaxValueComposite", () => {
  it("returns data unchanged when numReports <= 1", () => {
    const data = [{ url: "a", type: "x", val: 10 }];
    const result = sortByMaxValueComposite(
      data,
      (d) => `${d.url}-${d.type}`,
      (d) => d.val,
      1,
    );
    expect(result).toBe(data);
  });

  it("sorts by max value per composite key", () => {
    const data = [
      { url: "a", type: "x", val: 10 },
      { url: "a", type: "y", val: 50 },
      { url: "b", type: "x", val: 30 },
    ];
    const result = sortByMaxValueComposite(
      data,
      (d) => `${d.url}-${d.type}`,
      (d) => d.val,
      2,
    );
    expect(result[0]?.val).toBe(50);
  });
});
