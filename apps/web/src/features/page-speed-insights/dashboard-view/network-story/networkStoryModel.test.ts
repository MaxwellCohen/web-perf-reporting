import { describe, expect, it } from "vitest";
import { networkStoryFromSummaries } from "@/features/page-speed-insights/dashboard-view/network-story/networkStoryModel";
import type { ResourceSummary } from "@/features/page-speed-insights/network-metrics/resourceSummary";

function summary(label: string, tiles: ResourceSummary["tiles"]): ResourceSummary {
  return { label, tiles };
}

describe("networkStoryFromSummaries", () => {
  it("returns null when there is no resource summary", () => {
    expect(networkStoryFromSummaries([])).toBeNull();
  });

  it("drops empty summaries and returns null when nothing remains", () => {
    expect(
      networkStoryFromSummaries([
        summary("Mobile", []),
        summary("Desktop", [
          { resourceType: "script", label: "Script", requestCount: 0, transferSize: 0 },
          { resourceType: "total", label: "Total", requestCount: 0, transferSize: 0 },
        ]),
      ]),
    ).toBeNull();
  });

  it("builds slice shares from the total and leaves total and third-party off the bar", () => {
    const story = networkStoryFromSummaries([
      summary("Mobile", [
        { resourceType: "total", label: "Total", requestCount: 10, transferSize: 1000 },
        { resourceType: "script", label: "Script", requestCount: 4, transferSize: 600 },
        { resourceType: "image", label: "Image", requestCount: 5, transferSize: 400 },
        { resourceType: "third-party", label: "Third-party", requestCount: 2, transferSize: 250 },
        { resourceType: "media", label: "Media", requestCount: 0, transferSize: 0 },
      ]),
    ]);

    expect(story).not.toBeNull();
    const device = story!.devices[0]!;
    expect(device.slices.map((slice) => slice.resourceType)).toEqual(["script", "image"]);
    expect(device.slices.map((slice) => slice.share)).toEqual([0.6, 0.4]);
    expect(device.slices.reduce((sum, slice) => sum + (slice.share ?? 0), 0)).toBeCloseTo(1);
    expect(device.slices.reduce((sum, slice) => sum + slice.transferSize, 0)).toBe(
      device.totalBytes,
    );
    expect(device.totalBytes).toBe(1000);
    expect(device.requestCount).toBe(10);
    expect(device.thirdPartyBytes).toBe(250);
    expect(device.thirdPartyShare).toBe(0.25);
    expect(story!.facts).toEqual(["total", "requests", "third-party"]);
  });

  it("keeps partial shares as fractions of the total instead of folding in third-party", () => {
    const story = networkStoryFromSummaries([
      summary("Mobile", [
        { resourceType: "total", label: "Total", requestCount: 8, transferSize: 1000 },
        { resourceType: "script", label: "Script", requestCount: 2, transferSize: 250 },
        { resourceType: "image", label: "Image", requestCount: 2, transferSize: 250 },
        { resourceType: "third-party", label: "Third-party", requestCount: 4, transferSize: 500 },
      ]),
    ]);

    const device = story!.devices[0]!;
    expect(device.slices.map((slice) => slice.share)).toEqual([0.25, 0.25]);
    expect(device.slices.reduce((sum, slice) => sum + (slice.share ?? 0), 0)).toBeCloseTo(0.5);
    expect(device.thirdPartyShare).toBe(0.5);
  });

  it("omits total and request facts when those tiles are absent and leaves shares null", () => {
    const story = networkStoryFromSummaries([
      summary("Desktop", [
        { resourceType: "image", label: "Image", requestCount: 1, transferSize: 50 },
      ]),
    ]);

    expect(story!.facts).toEqual([]);
    expect(story!.devices[0]).toMatchObject({
      totalBytes: null,
      requestCount: null,
      thirdPartyBytes: null,
      thirdPartyShare: null,
    });
    expect(story!.devices[0]!.slices[0]).toMatchObject({
      resourceType: "image",
      share: null,
      transferSize: 50,
      requestCount: 1,
    });
  });

  it("keeps a third-party fact without putting it on the bar", () => {
    const story = networkStoryFromSummaries([
      summary("Mobile", [
        { resourceType: "third-party", label: "Third-party", requestCount: 3, transferSize: 80 },
      ]),
    ]);

    expect(story!.facts).toEqual(["third-party"]);
    expect(story!.devices[0]!.slices).toEqual([]);
    expect(story!.devices[0]!.thirdPartyBytes).toBe(80);
    expect(story!.devices[0]!.thirdPartyShare).toBeNull();
  });

  it("drops an empty report and keeps independent shares per label", () => {
    const story = networkStoryFromSummaries([
      summary("Mobile", []),
      summary("Mobile", [
        { resourceType: "total", label: "Total", requestCount: 4, transferSize: 100 },
        { resourceType: "script", label: "Script", requestCount: 4, transferSize: 25 },
      ]),
      summary("Desktop", [
        { resourceType: "total", label: "Total", requestCount: 2, transferSize: 200 },
        { resourceType: "script", label: "Script", requestCount: 1, transferSize: 200 },
        { resourceType: "image", label: "Image", requestCount: 1, transferSize: 0 },
      ]),
    ]);

    expect(story!.devices.map((device) => device.label)).toEqual(["Mobile", "Desktop"]);
    expect(story!.devices[0]!.slices.map((slice) => slice.share)).toEqual([0.25]);
    expect(story!.devices[1]!.slices.map((slice) => slice.resourceType)).toEqual([
      "script",
      "image",
    ]);
    expect(story!.devices[1]!.slices.map((slice) => slice.share)).toEqual([1, 0]);
    expect(story!.facts).toEqual(["total", "requests"]);
  });
});
