import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  fetchPageSpeedInsightsByPublicId,
  getPageSpeedProgress,
  pollProgressFraction,
  resetPageSpeedInsightsByPublicId,
} from "@/lib/page-speed-insights/pageSpeedInsightsClient";
import { toWorkerJobState } from "@/lib/page-speed-insights/resolveWorkerEnvelope";

const json = (status: number, body: unknown) =>
  ({ ok: status < 400, status, text: async () => JSON.stringify(body) }) as Response;

describe("toWorkerJobState", () => {
  it("maps pending/queued to queued and everything else to running", () => {
    expect(toWorkerJobState("pending")).toBe("queued");
    expect(toWorkerJobState("QUEUED")).toBe("queued");
    expect(toWorkerJobState("processing")).toBe("running");
    expect(toWorkerJobState(undefined)).toBe("running");
  });
});

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
      .mockResolvedValueOnce(json(404, { status: "pending", url: "https://a.test" }))
      .mockResolvedValueOnce(json(404, { status: "processing", url: "https://a.test" }))
      .mockResolvedValueOnce(json(200, []));

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
      .mockResolvedValue(json(404, { status: "pending" }));

    const promise = fetchPageSpeedInsightsByPublicId("timeout-1");
    await vi.advanceTimersByTimeAsync(200_000);
    await expect(promise).resolves.toMatchObject({ status: "failed", reason: "timeout" });

    fetchMock.mockResolvedValue(json(200, []));
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
      .mockResolvedValueOnce(json(200, []));

    const promise = fetchPageSpeedInsightsByPublicId("err-3");
    await vi.advanceTimersByTimeAsync(10_000);
    await expect(promise).resolves.toEqual({ status: "ok", data: [] });
  });

  it("treats a queued 404 as still running", async () => {
    vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(json(404, { status: "queued" }))
      .mockResolvedValueOnce(json(200, []));

    const promise = fetchPageSpeedInsightsByPublicId("queued-1");
    await vi.advanceTimersByTimeAsync(2000);
    await expect(promise).resolves.toEqual({ status: "ok", data: [] });
  });

  it("returns an error reason for non-ok, non-404/500 responses", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(json(502, "bad gateway"));

    const promise = fetchPageSpeedInsightsByPublicId("err-2");
    await vi.advanceTimersByTimeAsync(10_000);
    await expect(promise).resolves.toMatchObject({ reason: "error" });
  });
});
