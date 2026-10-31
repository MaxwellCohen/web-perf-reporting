import { describe, expect, it } from "vitest";
import type { CruxReport } from "@/lib/schema";
import {
  formatCruxReport,
  formatDate,
  getNumber,
  getUrlString,
  groupBy,
  updateURl,
} from "@/lib/utils";

function asCruxReport(value: unknown): CruxReport {
  return value as CruxReport;
}

const baseCollectionPeriod = {
  firstDate: { year: 2024, month: 1, day: 1 },
  lastDate: { year: 2024, month: 1, day: 28 },
};

describe("utils", () => {
  it("formats crux reports and returns null when no url is present", () => {
    expect(formatCruxReport(asCruxReport({ record: { key: {} } }))).toBeNull();

    expect(
      formatCruxReport(
        asCruxReport({
          urlNormalizationDetails: {
            originalUrl: "https://example.com",
          },
          record: {
            key: {
              formFactor: "PHONE",
            },
            collectionPeriod: baseCollectionPeriod,
            metrics: {
              largest_contentful_paint: {
                percentiles: { p75: 2500 },
                histogram: [
                  { end: 2500, density: 0.5 },
                  { end: 4000, density: 0.3 },
                  { density: 0.2 },
                ],
              },
            },
          },
        }),
      ),
    ).toEqual([
      {
        url: "https://example.com",
        formFactor: "PHONE",
        origin: "url",
        start_date: "1/1/2024",
        end_date: "1/28/2024",
        metric_name: "largest_contentful_paint",
        P75: 2500,
        good_max: 2500,
        ni_max: 4000,
        good_density: 0.5,
        ni_density: 0.3,
        poor_density: 0.2,
      },
    ]);
  });

  it("groups values and returns typed primitive helpers", () => {
    expect(groupBy(["a", "ab", "b"], (item) => item[0]!)).toEqual({
      a: ["a", "ab"],
      b: ["b"],
    });
    expect(getUrlString("https://example.com")).toBe("https://example.com");
    expect(getUrlString(123)).toBe("");
    expect(getNumber(42)).toBe(42);
    expect(getNumber("42")).toBeUndefined();
  });

  it("normalizes user-provided urls", () => {
    expect(updateURl()).toBe("");
    expect(updateURl("example.com")).toBe("https://example.com");
    expect(updateURl("https://example.com")).toBe("https://example.com");
    expect(updateURl("https://www.example.com")).toBe("https://www.example.com");
    expect(updateURl("https://wwwstg.aspendental.com/schedule-an-appointment-2/")).toBe(
      "https://wwwstg.aspendental.com/schedule-an-appointment-2/",
    );
    expect(updateURl("https://staging.example.com/path")).toBe("https://staging.example.com/path");
    expect(updateURl("nota url")).toBe("");
  });
});
