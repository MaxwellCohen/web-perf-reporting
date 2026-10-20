import { describe, expect, it } from "vitest";
import type { CombinedRequest } from "./collectTimelineSources";
import { groupDownloads } from "./groupDownloads";

function request(
  url: string,
  resourceType: string,
  networkRequestTime: number,
): CombinedRequest {
  return {
    url,
    resourceType,
    networkRequestTime,
    networkEndTime: networkRequestTime + 10,
    renderBlocking: "non-blocking",
    isCriticalChain: false,
  };
}

describe("groupDownloads", () => {
  it("groups contiguous same-type requests", () => {
    const groups = groupDownloads([
      request("https://example.com/a.js", "Script", 10),
      request("https://example.com/b.js", "Script", 20),
    ]);
    expect(groups).toHaveLength(1);
    expect(groups[0]).toHaveLength(2);
  });

  it("splits when another type starts between two of the same type", () => {
    const groups = groupDownloads([
      request("https://example.com/a.js", "Script", 10),
      request("https://example.com/a.css", "Stylesheet", 15),
      request("https://example.com/b.js", "Script", 20),
    ]);
    expect(groups).toHaveLength(3);
  });
});
