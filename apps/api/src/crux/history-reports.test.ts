import { describe, expect, it } from "vitest";
import { formatCruxDate, historyResponseToReports } from "./history-reports";

describe("historyResponseToReports", () => {
  it("splits one collection period into a stored CrUX report", () => {
    const [report] = historyResponseToReports({
      record: {
        key: { origin: "https://example.com" },
        collectionPeriods: [
          {
            firstDate: { year: 2024, month: 1, day: 1 },
            lastDate: { year: 2024, month: 1, day: 7 },
          },
        ],
        metrics: {
          largest_contentful_paint: {
            histogramTimeseries: [
              { start: 0, end: 2500, densities: [0.7] },
              { start: 2500, end: 4000, densities: [0.2] },
              { start: 4000, densities: [0.1] },
            ],
            percentilesTimeseries: { p75s: ["2600"] },
          },
        },
      },
    });

    expect(report?.record).toMatchObject({
      metrics: {
        largest_contentful_paint: {
          percentiles: { p75: 2600 },
          histogram: [
            { density: 0.7 },
            { density: 0.2 },
            { density: 0.1 },
          ],
        },
      },
    });
    expect(formatCruxDate({ year: 2024, month: 1, day: 7 })).toContain("2024");
  });
});
