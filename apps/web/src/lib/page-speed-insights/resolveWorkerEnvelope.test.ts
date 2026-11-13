import { describe, expect, it } from "vitest";
import { toPageSpeedApiResponse } from "@/lib/page-speed-insights/resolveWorkerEnvelope";

describe("toPageSpeedApiResponse", () => {
  it("returns 404 for a missing envelope", async () => {
    const res = toPageSpeedApiResponse(null);
    expect(res.status).toBe(404);
    await expect(res.json()).resolves.toMatchObject({ state: "failed" });
  });

  it("returns failed with error and url", async () => {
    const res = toPageSpeedApiResponse({
      status: "failed",
      url: "https://example.com/page",
      data: { error: "Lighthouse could not load the page." },
    });
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({
      state: "failed",
      error: "Lighthouse could not load the page.",
      url: "https://example.com/page",
    });
  });

  it("maps queued and running statuses to a pending job state", async () => {
    await expect(toPageSpeedApiResponse({ status: "QUEUED" }).json()).resolves.toEqual({
      state: "pending",
      jobState: "queued",
    });
    await expect(
      toPageSpeedApiResponse({ status: "processing", url: "https://a.test" }).json(),
    ).resolves.toEqual({ state: "pending", jobState: "running", url: "https://a.test" });
  });

  it("returns ready with object or JSON-string data", async () => {
    await expect(
      toPageSpeedApiResponse({ status: "completed", data: [{ ok: true }] }).json(),
    ).resolves.toEqual({ state: "ready", data: [{ ok: true }] });
    await expect(
      toPageSpeedApiResponse({ status: "completed", data: '[{"x":1}]' }).json(),
    ).resolves.toEqual({ state: "ready", data: [{ x: 1 }] });
  });

  it("returns ready without data when completed with no payload", async () => {
    await expect(toPageSpeedApiResponse({ status: "completed" }).json()).resolves.toEqual({
      state: "ready",
    });
  });
});
