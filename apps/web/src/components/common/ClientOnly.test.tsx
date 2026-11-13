import { act, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ClientOnly } from "@/components/common/ClientOnly";

describe("ClientOnly", () => {
  it("renders children after client hydration", async () => {
    render(
      <ClientOnly>
        <span data-testid="child">Child content</span>
      </ClientOnly>,
    );
    await act(async () => {});
    expect(screen.getByTestId("child")).toHaveTextContent("Child content");
  });
});
