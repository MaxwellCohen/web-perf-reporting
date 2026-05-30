import { describe, expect, it } from "vitest";
import {
  getCompletedPayloadFromEnvelope,
  getFailureMessageFromEnvelope,
  getTestUrlFromEnvelope,
  resolveWorkerEnvelope,
  type WorkerJobEnvelope,
} from "@/lib/page-speed-insights/resolveWorkerEnvelope";

describe("getCompletedPayloadFromEnvelope", () => {
  it("returns payload when completed with data", () => {
    const env: WorkerJobEnvelope = { status: "completed", data: '{"x":1}' };
    expect(getCompletedPayloadFromEnvelope(env)).toEqual({
      ok: true,
      payload: '{"x":1}',
    });
  });

  it("treats missing data as empty", () => {
    expect(getCompletedPayloadFromEnvelope({ status: "completed" })).toEqual({
      ok: false,
      reason: "empty",
    });
  });

  it("maps failed status", () => {
    expect(getCompletedPayloadFromEnvelope({ status: "failed" })).toEqual({
      ok: false,
      reason: "failed",
    });
  });

  it("maps non-completed as not_ready", () => {
    expect(getCompletedPayloadFromEnvelope({ status: "pending" })).toEqual({
      ok: false,
      reason: "not_ready",
    });
  });
});

describe("getTestUrlFromEnvelope", () => {
  it("reads url from envelope", () => {
    expect(
      getTestUrlFromEnvelope({
        status: "failed",
        url: "https://example.com/page",
      }),
    ).toBe("https://example.com/page");
  });

  it("returns undefined when url is missing", () => {
    expect(getTestUrlFromEnvelope({ status: "failed" })).toBeUndefined();
  });
});

describe("getFailureMessageFromEnvelope", () => {
  it("reads error from failed envelope data object", () => {
    expect(
      getFailureMessageFromEnvelope({
        status: "failed",
        data: { error: "Lighthouse could not load the page." },
      }),
    ).toBe("Lighthouse could not load the page.");
  });

  it("falls back to a generic message when no error detail exists", () => {
    expect(getFailureMessageFromEnvelope({ status: "failed" })).toBe(
      "The PageSpeed Insights report could not be generated.",
    );
  });
});

describe("resolveWorkerEnvelope", () => {
  it("stringifies object data when completed", () => {
    expect(resolveWorkerEnvelope({ status: "completed", data: { ok: true } })).toEqual({
      kind: "ready",
      body: JSON.stringify({ ok: true }),
    });
  });
});
