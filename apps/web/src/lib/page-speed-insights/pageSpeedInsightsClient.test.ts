import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  fetchPageSpeedInsightsByPublicId,
  getPageSpeedProgress,
  pollProgressFraction,
  resetPageSpeedInsightsByPublicId,
} from "@/lib/page-speed-insights/pageSpeedInsightsClient";

const json = (status: number, body: unknown) =>
  ({
    ok: status < 400,
    status,
    text: async () => JSON.stringify(body),
    json: async () => body,
  }) as Response;

describe("pollProgressFraction", () => {
  it("grows with polls and is capped below 1", () => {
    expect(pollProgressFraction(0)).toBe(0);
    expect(pollProgressFraction(45)).toBe(0.5);
    expect(pollProgressFraction(10_000)).toBe(0.95);
  });
});

describe("fetchPageSpeedInsightsByPublicId", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("publishes job state while polling, then clears it and resolves", async () => {
    vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(
        json(200, { state: "pending", jobState: "queued", url: "https://a.test" }),
      )
      .mockResolvedValueOnce(
        json(200, { state: "pending", jobState: "running", url: "https://a.test" }),
      )
      .mockResolvedValueOnce(json(200, { state: "ready", data: [] }));

    const promise = fetchPageSpeedInsightsByPublicId("prog-1");
    await vi.advanceTimersByTimeAsync(0);
    expect(getPageSpeedProgress("prog-1")).toEqual({
      state: "queued",
      url: "https://a.test",
      polls: 1,
    });
    await vi.advanceTimersByTimeAsync(2000);
    expect(getPageSpeedProgress("prog-1")).toMatchObject({ state: "running", polls: 2 });
    await vi.advanceTimersByTimeAsync(2000);

    await expect(promise).resolves.toEqual({ status: "ok", data: [] });
    expect(getPageSpeedProgress("prog-1")).toBeUndefined();
  });

  it("fails with a timeout reason when the job never finishes, and retry re-fetches", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(json(200, { state: "pending", jobState: "queued" }));

    const promise = fetchPageSpeedInsightsByPublicId("timeout-1");
    await vi.advanceTimersByTimeAsync(200_000);
    await expect(promise).resolves.toMatchObject({ status: "failed", reason: "timeout" });

    fetchMock.mockResolvedValue(json(200, { state: "ready", data: [] }));
    resetPageSpeedInsightsByPublicId("timeout-1");
    const retried = fetchPageSpeedInsightsByPublicId("timeout-1");
    expect(retried).not.toBe(promise);
    await expect(retried).resolves.toEqual({ status: "ok", data: [] });
  });

  it("returns an error reason when the request throws", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("offline"));

    const promise = fetchPageSpeedInsightsByPublicId("err-1");
    await vi.advanceTimersByTimeAsync(10_000);
    await expect(promise).resolves.toMatchObject({ status: "failed", reason: "error" });
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it("tolerates transient fetch errors while polling", async () => {
    vi.spyOn(globalThis, "fetch")
      .mockRejectedValueOnce(new Error("blip"))
      .mockRejectedValueOnce(new Error("blip"))
      .mockResolvedValueOnce(json(200, { state: "ready", data: [] }));

    const promise = fetchPageSpeedInsightsByPublicId("err-3");
    await vi.advanceTimersByTimeAsync(10_000);
    await expect(promise).resolves.toEqual({ status: "ok", data: [] });
  });

  it("maps a failed state to a job failure with its message and url", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      json(200, { state: "failed", error: "boom", url: "https://a.test" }),
    );
    await expect(fetchPageSpeedInsightsByPublicId("job-1")).resolves.toEqual({
      status: "failed",
      reason: "job",
      error: "boom",
      url: "https://a.test",
    });
  });

  it("maps a 404 to not_found", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(json(404, { state: "failed", error: "x" }));
    await expect(fetchPageSpeedInsightsByPublicId("nf-1")).resolves.toMatchObject({
      reason: "not_found",
    });
  });

  it("returns an error reason for non-ok, non-404/500 responses", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(json(502, "bad gateway"));

    const promise = fetchPageSpeedInsightsByPublicId("err-2");
    await vi.advanceTimersByTimeAsync(10_000);
    await expect(promise).resolves.toMatchObject({ reason: "error" });
  });
});
