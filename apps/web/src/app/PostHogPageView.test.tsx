import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const captureMock = vi.fn();
let pathnameValue: string | null = "/reports";
let searchParamsValue = new URLSearchParams("device=mobile");

vi.mock("next/navigation", () => ({
  usePathname: () => pathnameValue,
  useSearchParams: () => searchParamsValue,
}));

vi.mock("posthog-js", () => ({
  default: {
    capture: (...args: unknown[]) => captureMock(...args),
  },
}));

import PostHogPageView from "@/app/PostHogPageView";

describe("app/PostHogPageView", () => {
  beforeEach(() => {
    captureMock.mockReset();
    pathnameValue = "/reports";
    searchParamsValue = new URLSearchParams("device=mobile");
    // happy-dom has undefined origin by default; stub for URL construction
    Object.defineProperty(window, "origin", {
      value: "http://localhost:3000",
      writable: true,
      configurable: true,
    });
  });

  it("captures a pageview with the current path and query string", async () => {
    render(<PostHogPageView />);

    await waitFor(() => {
      expect(captureMock).toHaveBeenCalledWith("$pageview", {
        $current_url: "http://localhost:3000/reports?device=mobile",
      });
    });
  });

  it("skips tracking when pathname is unavailable", async () => {
    pathnameValue = null;

    render(<PostHogPageView />);

    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(captureMock).not.toHaveBeenCalled();
  });
});
