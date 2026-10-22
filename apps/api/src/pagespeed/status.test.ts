import { describe, expect, it } from "vitest";
import { derivePageSpeedStatus } from "./status";
import type { StoredRecord } from "./storage";

function record(overrides: Partial<StoredRecord> = {}): StoredRecord {
  return {
    publicId: "job-1",
    url: "https://example.com",
    formFactor: "ALL",
    date: 1,
    status: "pending",
    dataUrl: "",
    processingStartedAt: null,
    ...overrides,
  };
}

describe("derivePageSpeedStatus", () => {
  it("stays pending until both strategies finish", () => {
    expect(derivePageSpeedStatus(record(), { status: "completed", dataUrl: "m" }, null).status).toBe(
      "pending",
    );
  });

  it("is completed when both strategy objects exist", () => {
    expect(
      derivePageSpeedStatus(
        record(),
        { status: "completed", dataUrl: "mobile.json" },
        { status: "completed", dataUrl: "desktop.json" },
      ),
    ).toEqual({
      status: "completed",
      mobileKey: "mobile.json",
      desktopKey: "desktop.json",
    });
  });

  it("fails when either strategy fails", () => {
    expect(
      derivePageSpeedStatus(record(), { status: "failed", error: "quota" }, null).status,
    ).toBe("failed");
  });

  it("keeps an already stored combined result", () => {
    expect(derivePageSpeedStatus(record({ status: "completed", dataUrl: "combined.json" }), null, null)).toEqual({
      status: "completed",
    });
  });
});
