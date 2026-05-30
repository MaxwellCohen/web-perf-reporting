import { render, screen } from "@testing-library/react";
import { useQueryClient } from "@tanstack/react-query";
import { describe, expect, it, vi } from "vitest";

const posthogInitMock = vi.fn();

vi.mock("posthog-js", () => ({
  default: {
    init: (...args: unknown[]) => posthogInitMock(...args),
  },
}));

vi.mock("posthog-js/react", () => ({
  PostHogProvider: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="posthog-provider">{children}</div>
  ),
}));

import { PostHogProvider, QueryProvider } from "@/app/providers";

function QueryConsumer() {
  const queryClient = useQueryClient();

  return (
    <div data-testid="query-stale-time">
      {String(queryClient.getDefaultOptions().queries?.staleTime)}
    </div>
  );
}

describe("app/providers", () => {
  it("provides a configured query client to descendants", () => {
    render(
      <QueryProvider>
        <QueryConsumer />
      </QueryProvider>,
    );

    expect(screen.getByTestId("query-stale-time")).toHaveTextContent("60000");
  });

  it("initializes posthog and renders children", () => {
    const { container } = render(
      <PostHogProvider>
        <div>Provider child</div>
      </PostHogProvider>,
    );

    expect(posthogInitMock).toHaveBeenCalledWith("", {
      api_host: undefined,
      person_profiles: "identified_only",
      capture_pageview: false,
    });
    expect(container.firstChild).toMatchSnapshot();
  });
});
