import { beforeEach, describe, expect, it, vi } from "vitest";

const captureExceptionMock = vi.fn();
const parseMock = vi.fn();

vi.mock("@sentry/nextjs", () => ({
  captureException: (error: unknown) => captureExceptionMock(error),
}));

vi.mock("@/lib/schema", () => ({
  cruxReportSchema: {
    parse: (data: unknown) => parseMock(data),
  },
}));

import { getCurrentCruxData } from "@/lib/services";

describe("lib/services", () => {
  beforeEach(() => {
    captureExceptionMock.mockReset();
    parseMock.mockReset();
    vi.restoreAllMocks();
  });

  it("fetches and parses current crux data", async () => {
    vi.stubEnv("PAGESPEED_INSIGHTS_API", "test-api-key");
    parseMock.mockReturnValue({ parsed: true });
    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      json: async () => ({ record: { key: { url: "https://example.com" } } }),
    } as Response);

    const result = await getCurrentCruxData({
      url: "https://example.com",
      formFactor: "PHONE",
    });

    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining("content-chromeuxreport.googleapis.com"),
      expect.objectContaining({
        method: "POST",
        next: { revalidate: 86_400 },
        body: JSON.stringify({
          url: "https://example.com",
          formFactor: "PHONE",
          origin: undefined,
        }),
      }),
    );
    expect(parseMock).toHaveBeenCalled();
    expect(result).toEqual({ parsed: true });
  });

  it("captures errors and returns null when the request fails", async () => {
    vi.stubEnv("PAGESPEED_INSIGHTS_API", "test-api-key");
    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: false,
      statusText: "Bad Request",
    } as Response);

    const result = await getCurrentCruxData({
      origin: "https://example.com",
      formFactor: undefined,
    });

    expect(result).toBeNull();
    expect(captureExceptionMock).toHaveBeenCalled();
  });
});
