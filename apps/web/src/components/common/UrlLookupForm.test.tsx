import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import posthog from "posthog-js";
import { UrlLookupForm } from "@/components/common/UrlLookupForm";

vi.mock("posthog-js", () => ({
  default: {
    capture: vi.fn<() => void>(),
  },
}));

describe("UrlLookupForm", () => {
  it("renders an accessible url input form", () => {
    render(<UrlLookupForm />);

    const input = screen.getByLabelText("Enter an url:");
    expect(input).toHaveAttribute("type", "url");
    expect(input).toHaveAttribute("name", "url");
    expect(screen.getByRole("button", { name: "Submit" })).toBeInTheDocument();
  });

  it("captures the submitted URL in analytics", async () => {
    const { container } = render(<UrlLookupForm />);

    const input = container.querySelector<HTMLInputElement>('input[type="url"]')!;
    const form = input.closest("form")!;

    fireEvent.change(input, { target: { value: "https://example.com" } });
    Object.defineProperty(form, "url", {
      configurable: true,
      value: { value: "https://example.com" },
    });

    fireEvent.submit(form);

    await waitFor(() => {
      expect(posthog.capture).toHaveBeenCalledWith("Search for URL", {
        search_value: "https://example.com",
      });
    });
  });
});
