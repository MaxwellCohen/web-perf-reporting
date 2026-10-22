import { describe, expect, it } from "vitest";
import { isHistoryFresh, newestToMs } from "./freshness";

describe("isHistoryFresh", () => {
  const now = Date.UTC(2026, 9, 22);

  it("treats a collection within eight days as fresh", () => {
    expect(isHistoryFresh(new Date(now - 2 * 24 * 60 * 60 * 1000), now)).toBe(true);
  });

  it("treats older history and empty scopes as stale", () => {
    expect(isHistoryFresh(new Date(now - 9 * 24 * 60 * 60 * 1000), now)).toBe(false);
    expect(isHistoryFresh(null, now)).toBe(false);
  });

  it("reads unix seconds from a raw SQLite value", () => {
    expect(newestToMs(1_700_000_000)).toBe(1_700_000_000_000);
  });
});
