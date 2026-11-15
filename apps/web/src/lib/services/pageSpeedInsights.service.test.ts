import { beforeEach, describe, expect, it, vi } from "vitest";

const captureExceptionMock = vi.fn<(error: unknown) => void>();

vi.mock("@sentry/nextjs", () => ({
  captureException: (error: unknown) => captureExceptionMock(error),
}));

import { requestPageSpeedData } from "@/lib/services/pageSpeedInsights.service";

describe("pageSpeedInsights.service", () => {
  beforeEach(() => {
    captureExceptionMock.mockReset();
    vi.restoreAllMocks();
  });

  it("returns null when no test url is provided", async () => {
    await expect(requestPageSpeedData(undefined)).resolves.toBeNull();
  });

  it("requests fresh page speed data and returns the public id", async () => {
    vi.stubEnv("WORKER_URL", "https://worker.example.test");
    vi.stubEnv("WORKER_API_KEY", "worker-secret");
    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      json: async () => ({
        publicId: "public-123",
        status: "completed",
        url: "https://example.com",
        data: [],
      }),
    } as Response);

    const result = await requestPageSpeedData("https://example.com");

    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining("https://worker.example.test"),
      expect.objectContaining({
        headers: expect.objectContaining({ "x-api-key": "worker-secret" }),
      }),
    );
    expect(result).toBe("public-123");
  });

  it("captures errors when the worker request fails", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: false,
      status: 500,
    } as Response);

    const result = await requestPageSpeedData("https://example.com");

    expect(result).toBeNull();
    expect(captureExceptionMock).toHaveBeenCalled();
  });
});
