import { render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

const posthogInitMock = vi.fn();

vi.mock("posthog-js", () => ({
  default: {
    init: (...args: unknown[]) => posthogInitMock(...args),
    capture: vi.fn(),
  },
}));

vi.mock("posthog-js/react", () => ({
  PostHogProvider: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="posthog-provider">{children}</div>
  ),
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

    // Children render immediately; provider initializes async after mount.
    expect(screen.getByText("Provider child")).toBeInTheDocument();

    await waitFor(() => {
      expect(posthogInitMock).toHaveBeenCalledWith("test-key", {
        api_host: undefined,
        person_profiles: "identified_only",
        capture_pageview: false,
      });
    });
    await waitFor(() => {
      expect(screen.getByTestId("posthog-provider")).toBeInTheDocument();
    });
  });
});
