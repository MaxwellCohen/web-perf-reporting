import { render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

const posthogInitMock = vi.fn<(...args: unknown[]) => void>();

vi.mock("posthog-js", () => ({
  default: {
    init: (...args: unknown[]) => posthogInitMock(...args),
    capture: vi.fn<() => void>(),
  },
}));

import { PostHogProvider } from "@/app/PostHogProvider";

describe("app/PostHogProvider", () => {
  it("initializes posthog and renders children", async () => {
    process.env.NEXT_PUBLIC_POSTHOG_KEY = "test-key";
    render(
      <PostHogProvider>
        <div>Provider child</div>
      </PostHogProvider>,
    );

    // Children render immediately; posthog initializes async after mount.
    const child = screen.getByText("Provider child");

    await waitFor(() => {
      expect(posthogInitMock).toHaveBeenCalledWith("test-key", {
        api_host: undefined,
        person_profiles: "identified_only",
        capture_pageview: false,
        disable_surveys: true,
        persistence: "memory",
        disable_session_recording: true,
      });
    });
    // Children must not be remounted/re-parented after init.
    expect(screen.getByText("Provider child")).toBe(child);
  });
});
