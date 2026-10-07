import { render, screen } from "@testing-library/react";
import { useQueryClient } from "@tanstack/react-query";
import { describe, expect, it, vi } from "vitest";

import { QueryProvider } from "@/app/providers";

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
});
