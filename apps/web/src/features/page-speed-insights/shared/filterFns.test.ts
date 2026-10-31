import { describe, expect, it } from "vitest";
import {
  booleanFilterFn,
  standardFilterFns,
} from "@/features/page-speed-insights/shared/filterFns";

function createRow(value: unknown) {
  return {
    getValue: () => value,
  } as any;
}

const noopAddMeta = () => {};

describe("filterFns", () => {
  it("passes all rows when the boolean filter is empty", () => {
    expect(booleanFilterFn(createRow(true), "enabled", [], noopAddMeta)).toBe(true);
    expect(booleanFilterFn(createRow(false), "enabled", undefined, noopAddMeta)).toBe(true);
  });

  it("filters boolean-like values using truthiness", () => {
    expect(booleanFilterFn(createRow(true), "enabled", [true], noopAddMeta)).toBe(true);
    expect(booleanFilterFn(createRow(1), "enabled", [true], noopAddMeta)).toBe(true);
    expect(booleanFilterFn(createRow(false), "enabled", [true], noopAddMeta)).toBe(false);
    expect(booleanFilterFn(createRow(0), "enabled", [false], noopAddMeta)).toBe(true);
  });
});
