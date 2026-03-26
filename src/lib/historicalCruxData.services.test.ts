import { describe, expect, it, vi, beforeEach } from "vitest";
import { getHistoricalCruxData } from "./historicalCruxData.services";

vi.mock("@/db", () => ({
  db: {
    insert: vi.fn(() => ({
      values: vi.fn(() => ({
        onConflictDoNothing: vi.fn(() => ({
          execute: vi.fn().mockResolvedValue(undefined),
        })),
      })),
    })),
    select: vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn(() => ({
          orderBy: vi.fn().mockResolvedValue([{ data: {} }]),
        })),
      })),
    })),
  },
}));

vi.mock("@sentry/nextjs", () => ({
  captureException: vi.fn(),
}));

const mockFetch = vi.fn();

const baseHistogram = [
  { start: 0, end: 100, densities: [0.5] },
  { start: 100, end: 200, densities: [0.3] },
  { start: 200, densities: [0.2] },
];

const validCruxHistoryResponse = {
  record: {
    key: { origin: "https://example.com", formFactor: "PHONE" },
    collectionPeriods: [
      {
        firstDate: { year: 2024, month: 1, day: 1 },
        lastDate: { year: 2024, month: 1, day: 15 },
      },
    ],
    metrics: {
      round_trip_time: {
        histogramTimeseries: baseHistogram,
        percentilesTimeseries: { p75s: [50] },
      },
      experimental_time_to_first_byte: {
        histogramTimeseries: baseHistogram,
        percentilesTimeseries: { p75s: [50] },
      },
      first_contentful_paint: {
        histogramTimeseries: baseHistogram,
        percentilesTimeseries: { p75s: [1500] },
      },
      interaction_to_next_paint: {
        histogramTimeseries: baseHistogram,
        percentilesTimeseries: { p75s: [100] },
      },
      cumulative_layout_shift: {
        histogramTimeseries: baseHistogram,
        percentilesTimeseries: { p75s: [0.05] },
      },
      largest_contentful_paint: {
        histogramTimeseries: baseHistogram,
        percentilesTimeseries: { p75s: [2000] },
      },
    },
  },
};

describe("getHistoricalCruxData", () => {
  beforeEach(() => {
    process.env.PAGESPEED_INSIGHTS_API = "test-api-key";
    global.fetch = mockFetch;
  });

  it("throws when neither url nor origin provided", async () => {
    await expect(getHistoricalCruxData({})).rejects.toThrow(
      "Either URL or origin must be provided",
    );
  });

  it("returns null when PAGESPEED_INSIGHTS_API is not set", async () => {
    const orig = process.env.PAGESPEED_INSIGHTS_API;
    delete process.env.PAGESPEED_INSIGHTS_API;
    const result = await getHistoricalCruxData({ url: "https://example.com" });
    process.env.PAGESPEED_INSIGHTS_API = orig;
    expect(result).toBeNull();
  });

  it("returns null when API request fails", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      statusText: "Internal Server Error",
      json: () => Promise.resolve({ error: "Server error" }),
    } as unknown as Response);

    const result = await getHistoricalCruxData({ url: "https://example.com" });
    expect(result).toBeNull();
  });

  it("calls fetch and returns data when API succeeds", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(validCruxHistoryResponse),
    } as unknown as Response);

    const result = await getHistoricalCruxData({ url: "https://example.com" });
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("chromeuxreport.googleapis.com"),
      expect.objectContaining({
        method: "POST",
        headers: { "Content-Type": "application/json" },
      }),
    );
    expect(result).toBeDefined();
    expect(Array.isArray(result)).toBe(true);
  });
});
