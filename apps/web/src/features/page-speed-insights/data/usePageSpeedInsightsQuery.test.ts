import { act, render, screen } from "@testing-library/react";
import React, { Suspense } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { usePageSpeedInsightsQueryByPublicId } from "@/features/page-speed-insights/data/usePageSpeedInsightsQuery";
import {
  clearPageSpeedInsightsByPublicIdCache,
  type PageSpeedLoadResult,
} from "@/lib/page-speed-insights/pageSpeedInsightsClient";

function HookProbe({
  publicId,
  onResult,
}: {
  publicId: string;
  onResult: (state: PageSpeedLoadResult) => void;
}) {
  const state = usePageSpeedInsightsQueryByPublicId(publicId);
  onResult(state);
  return React.createElement("div", { "data-testid": "hook-result" }, JSON.stringify(state));
}

async function renderHookProbe(publicId: string) {
  let latest: PageSpeedLoadResult | undefined;
  await act(async () => {
    render(
      React.createElement(
        Suspense,
        {
          fallback: React.createElement("div", { "data-testid": "suspense-fallback" }, "loading"),
        },
        React.createElement(HookProbe, {
          publicId,
          onResult: (state) => {
            latest = state;
          },
        }),
      ),
    );
  });
  return {
    getLatest: () => latest,
  };
}

describe("usePageSpeedInsightsQueryByPublicId", () => {
  beforeEach(() => {
    clearPageSpeedInsightsByPublicIdCache();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("fetches and returns ok result when publicId is provided", async () => {
    const mockData = [
      {
        lighthouseResult: { finalDisplayedUrl: "https://example.com" },
      },
    ];
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      text: async () => JSON.stringify(mockData),
    } as Response);

    const { getLatest } = await renderHookProbe("public-123");

    expect(screen.getByTestId("hook-result")).toBeInTheDocument();
    expect(getLatest()).toEqual({ status: "ok", data: mockData });
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/pagespeed/public-123",
      expect.objectContaining({ method: "GET" }),
    );
  });

  it("returns failed status when response status is 500", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: false,
      status: 500,
      text: async () => "Server error",
    } as Response);

    const { getLatest } = await renderHookProbe("public-123");

    expect(screen.getByTestId("hook-result")).toBeInTheDocument();
    expect(getLatest()).toEqual({ status: "failed" });
  });

  it("returns failed status with error message from JSON 500 body", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: false,
      status: 500,
      text: async () =>
        JSON.stringify({
          status: "failed",
          error: "Lighthouse could not load the page.",
          url: "https://example.com/page",
        }),
    } as Response);

    const { getLatest } = await renderHookProbe("public-123");

    expect(screen.getByTestId("hook-result")).toBeInTheDocument();
    expect(getLatest()).toEqual({
      status: "failed",
      error: "Lighthouse could not load the page.",
      url: "https://example.com/page",
    });
  });

  it("returns failed status when response JSON is invalid", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      text: async () => "invalid json",
    } as Response);

    const { getLatest } = await renderHookProbe("public-123");

    expect(screen.getByTestId("hook-result")).toBeInTheDocument();
    expect(getLatest()).toEqual({
      status: "failed",
      error: "The PageSpeed Insights response could not be parsed.",
    });
  });

  it("reuses the same Promise across renders for a publicId", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      text: async () => JSON.stringify([]),
    } as Response);

    await renderHookProbe("public-123");
    await renderHookProbe("public-123");

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
