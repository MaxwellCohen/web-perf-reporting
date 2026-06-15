import { describe, expect, it } from "vitest";
import {
  normalizePageSpeedInsights,
  parseViewerJsonEntries,
  parseViewerJsonString,
} from "@/components/viewer/parseViewerJson";

describe("parseViewerJson", () => {
  const lighthouseResult = { categories: {}, audits: {} };

  it("normalizes objects with lighthouseResult", () => {
    expect(normalizePageSpeedInsights({ lighthouseResult, id: "extra" })).toEqual({
      lighthouseResult,
    });
  });

  it("passes through objects without lighthouseResult", () => {
    const raw = { foo: "bar" };
    expect(normalizePageSpeedInsights(raw)).toBe(raw);
  });

  it("parses a single report from a JSON string", () => {
    expect(parseViewerJsonString(JSON.stringify({ lighthouseResult }))).toEqual([
      { lighthouseResult },
    ]);
  });

  it("parses an array of reports from a JSON string", () => {
    expect(
      parseViewerJsonString(JSON.stringify([{ lighthouseResult }, { lighthouseResult }])),
    ).toHaveLength(2);
  });

  it("parses multiple entries", () => {
    expect(parseViewerJsonEntries([{ lighthouseResult }, { lighthouseResult }])).toHaveLength(2);
  });
});
