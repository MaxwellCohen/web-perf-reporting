import { describe, expect, it } from "vitest";
import {
  comparePageWeight,
  pageWeightReportFromEntry,
  urlKey,
} from "@/features/page-speed-insights/dashboard-view/page-weight/pageWeightModel";
import {
  KB,
  weightReport,
} from "@/features/page-speed-insights/dashboard-view/page-weight/pageWeightFixtures";

describe("pageWeightReportFromEntry", () => {
  it("reads totals and types from resource-summary, skipping rollups", () => {
    const report = pageWeightReportFromEntry(
      weightReport(
        "Mobile",
        [{ url: "https://a.com/app.js", resourceType: "Script", transferSize: 100 * KB }],
        [
          { resourceType: "total", requestCount: 3, transferSize: 150 * KB },
          { resourceType: "third-party", requestCount: 1, transferSize: 20 * KB },
          { resourceType: "script", requestCount: 2, transferSize: 120 * KB },
          { resourceType: "image", requestCount: 1, transferSize: 30 * KB },
          { resourceType: "font", requestCount: 0, transferSize: 0 },
        ],
      ),
    );

    expect(report?.totalBytes).toBe(150 * KB);
    expect(report?.requestCount).toBe(3);
    expect(report?.thirdPartyBytes).toBe(20 * KB);
    expect(report?.types.map((type) => type.resourceType)).toEqual(["Script", "Image"]);
  });

  it("falls back to network-requests and merges cache-busted URLs", () => {
    const report = pageWeightReportFromEntry(
      weightReport("Mobile", [
        { url: "https://a.com/app.js?v=1", resourceType: "Script", transferSize: 10 * KB },
        { url: "https://a.com/app.js?v=2", resourceType: "Script", transferSize: 5 * KB },
        { url: "https://a.com/hero.jpg", resourceType: "Image", transferSize: 40 * KB },
      ]),
    );

    expect(report?.totalBytes).toBe(55 * KB);
    expect(report?.requestCount).toBe(3);
    expect(report?.urls).toHaveLength(2);
    expect(report?.urls[1]).toMatchObject({ key: "https://a.com/app.js", requestCount: 2 });
  });

  it("returns null when nothing was downloaded", () => {
    expect(pageWeightReportFromEntry(weightReport("Mobile", []))).toBeNull();
  });
});

describe("comparePageWeight", () => {
  it("diffs totals, types, and URLs", () => {
    const a = pageWeightReportFromEntry(
      weightReport("A · Mobile", [
        { url: "https://a.com/app.js?v=1", resourceType: "Script", transferSize: 100 * KB },
        { url: "https://a.com/old.css", resourceType: "Stylesheet", transferSize: 10 * KB },
        { url: "https://a.com/logo.png", resourceType: "Image", transferSize: 5 * KB },
      ]),
    )!;
    const b = pageWeightReportFromEntry(
      weightReport("B · Mobile", [
        { url: "https://a.com/app.js?v=2", resourceType: "Script", transferSize: 60 * KB },
        { url: "https://a.com/new.woff2", resourceType: "Font", transferSize: 20 * KB },
        { url: "https://a.com/logo.png", resourceType: "Image", transferSize: 5 * KB },
      ]),
    )!;

    const result = comparePageWeight(a, b);

    expect(result.totalDelta).toBe(-30 * KB);
    expect(result.requestDelta).toBe(0);
    expect(result.types.find((row) => row.resourceType === "Script")?.delta).toBe(-40 * KB);
    expect(result.types.find((row) => row.resourceType === "Font")?.a).toBeNull();
    expect(result.urls.map((row) => [row.key, row.status])).toEqual([
      ["https://a.com/app.js", "shrank"],
      ["https://a.com/new.woff2", "added"],
      ["https://a.com/old.css", "removed"],
      ["https://a.com/logo.png", "same"],
    ]);
  });
});

describe("urlKey", () => {
  it("drops query and hash", () => {
    expect(urlKey("https://a.com/x.js?v=1#y")).toBe("https://a.com/x.js");
    expect(urlKey("not a url?x")).toBe("not a url");
  });
});
