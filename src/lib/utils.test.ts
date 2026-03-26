import { describe, expect, it } from "vitest";
import type { CruxHistoryReport, CruxReport } from "@/lib/schema";
import {
  convertCruxHistoryToReports,
  formatCruxHistoryReport,
  formatCruxReport,
  formatDate,
  formatFormFactor,
  getNumber,
  getUrlString,
  groupBy,
  updateURl,
} from "@/lib/utils";

function asCruxReport(value: unknown): CruxReport {
  return value as CruxReport;
}

function asCruxHistoryReport(value: unknown): CruxHistoryReport {
  return value as CruxHistoryReport;
}

const baseCollectionPeriod = {
  firstDate: { year: 2024, month: 1, day: 1 },
  lastDate: { year: 2024, month: 1, day: 28 },
};

describe("utils", () => {
  it("formats dates and form factors", () => {
    expect(formatDate({ year: 2024, month: 1, day: 28 })).toBe("1/28/2024");
    expect(formatDate()).toBe("");
    expect(formatFormFactor()).toBe("All");
    expect(formatFormFactor("PHONE_DESKTOP")).toBe("Phone Desktop");
  });

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

  it("formats crux history reports and skips invalid timeseries entries", () => {
    expect(
      formatCruxHistoryReport(
        asCruxHistoryReport({
          record: {
            key: {},
            metrics: {},
          },
        }),
      ),
    ).toBeNull();

    expect(
      formatCruxHistoryReport(
        asCruxHistoryReport({
          urlNormalizationDetails: {
            normalizedUrl: "https://example.com",
          },
          record: {
            key: {
              origin: "https://origin.example.com",
            },
            collectionPeriods: [
              baseCollectionPeriod,
              {
                firstDate: { year: 2024, month: 2, day: 1 },
                lastDate: { year: 2024, month: 2, day: 28 },
              },
            ],
            metrics: {
              largest_contentful_paint: {
                percentilesTimeseries: { p75s: [2500, 3000] },
                histogramTimeseries: [
                  { start: 0, end: 2500, densities: [0.5, 0.4] },
                  { start: 2500, end: 4000, densities: [0.3, 0.35] },
                  { start: 4000, densities: [0.2, 0.25] },
                ],
              },
            },
          },
        }),
        "desktop",
      ),
    ).toEqual([
      {
        url: "https://example.com",
        formFactor: "desktop",
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
      {
        url: "https://example.com",
        formFactor: "desktop",
        origin: "url",
        start_date: "2/1/2024",
        end_date: "2/28/2024",
        metric_name: "largest_contentful_paint",
        P75: 3000,
        good_max: 2500,
        ni_max: 4000,
        good_density: 0.4,
        ni_density: 0.35,
        poor_density: 0.25,
      },
    ]);
  });

  it("converts crux history reports back into point-in-time reports", () => {
    expect(
      convertCruxHistoryToReports(
        asCruxHistoryReport({
          urlNormalizationDetails: {
            normalizedUrl: "https://example.com",
          },
          record: {
            key: {
              origin: "https://origin.example.com",
              formFactor: "PHONE",
            },
            collectionPeriods: [baseCollectionPeriod],
            metrics: {
              largest_contentful_paint: {
                percentilesTimeseries: { p75s: [2500] },
                histogramTimeseries: [
                  { start: 0, end: 2500, densities: [0.5] },
                  { start: 2500, end: 4000, densities: [0.3] },
                  { start: 4000, densities: [0.2] },
                ],
              },
              navigation_types: {
                fractionTimeseries: {
                  navigate: { fractions: [0.4] },
                  navigate_cache: { fractions: [0.1] },
                  reload: { fractions: [0.2] },
                  restore: { fractions: [0.1] },
                  back_forward: { fractions: [0.1] },
                  back_forward_cache: { fractions: [0.05] },
                  prerender: { fractions: [0.05] },
                },
              },
              form_factors: {
                fractionTimeseries: {
                  desktop: { fractions: [0.2] },
                  phone: { fractions: [0.7] },
                  tablet: { fractions: [0.1] },
                },
              },
              largest_contentful_paint_resource_type: {
                fractionTimeseries: {
                  image: { fractions: [0.8] },
                  text: { fractions: [0.2] },
                },
              },
              largest_contentful_paint_image_time_to_first_byte: {
                percentilesTimeseries: { p75s: [120] },
              },
            },
          },
        }),
      )[0],
    ).toMatchObject({
      urlNormalizationDetails: {
        normalizedUrl: "https://example.com",
      },
      record: {
        key: {
          origin: "https://origin.example.com",
          formFactor: "PHONE",
        },
        metrics: {
          largest_contentful_paint: {
            percentiles: { p75: 2500 },
          },
          navigation_types: {
            fractions: {
              navigate: 0.4,
              prerender: 0.05,
            },
          },
          form_factors: {
            fractions: {
              desktop: 0.2,
              phone: 0.7,
              tablet: 0.1,
            },
          },
          largest_contentful_paint_resource_type: {
            fractions: {
              image: 0.8,
              text: 0.2,
            },
          },
          largest_contentful_paint_image_time_to_first_byte: {
            percentiles: { p75: 120 },
          },
        },
      },
    });
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
    expect(updateURl("example.com")).toBe("https://www.example.com");
    expect(updateURl("https://example.com")).toBe("https://www.example.com");
    expect(updateURl("nota url")).toBe("");
  });
});
