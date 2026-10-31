import { beforeEach, describe, expect, it, vi } from "vitest";

const captureExceptionMock = vi.fn();
const executeMock = vi.fn();
const whereMock = vi.fn(() => ({ execute: executeMock }));
const deleteMock = vi.fn((_arg: unknown) => ({ where: whereMock }));
const findFirstMock = vi.fn();

vi.mock("@sentry/nextjs", () => ({
  captureException: (error: unknown) => captureExceptionMock(error),
}));

vi.mock("@/db/schema", () => ({
  PageSpeedInsightsTable: {
    url: "url",
    status: "status",
    date: "date",
  },
}));

vi.mock("@/db", () => ({
  db: {
    query: {
      PageSpeedInsightsTable: {
        findFirst: (opts: unknown) => findFirstMock(opts),
      },
    },
    delete: (arg: unknown) => deleteMock(arg),
  },
}));

vi.mock("drizzle-orm", () => ({
  and: (...args: unknown[]) => ({ type: "and", args }),
  eq: (...args: unknown[]) => ({ type: "eq", args }),
  gt: (...args: unknown[]) => ({ type: "gt", args }),
}));

import { requestPageSpeedData } from "@/lib/services/pageSpeedInsights.service";

describe("pageSpeedInsights.service", () => {
  beforeEach(() => {
    captureExceptionMock.mockReset();
    executeMock.mockReset();
    whereMock.mockClear();
    deleteMock.mockClear();
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
