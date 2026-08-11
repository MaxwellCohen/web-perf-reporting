import { render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ResourceUrlCell } from "@/features/page-speed-insights/shared/ResourceUrlCell";

vi.mock("lucide-react", () => ({
  ExternalLink: () => <span data-testid="external-link" />,
}));

describe("ResourceUrlCell", () => {
  it("shows filename and host path for nested URLs", () => {
    const url = "https://m.media-amazon.com/images/I/91u1iWI.jpg";
    const { container } = render(<ResourceUrlCell url={url} />);
    const link = container.querySelector(`a[href="${url}"]`);
    expect(link).toBeTruthy();
    expect(link?.getAttribute("title")).toBe(url);
    expect(container.textContent).toContain("91u1iWI.jpg");
    expect(container.textContent).toContain("m.media-amazon.com/images/I/");
  });

  it("shows origin when path is root", () => {
    const url = "https://example.com/";
    const { container } = render(<ResourceUrlCell url={url} />);
    expect(container.textContent).toContain("https://example.com");
  });

  it("falls back to raw string for invalid URLs", () => {
    const url = "not-a-url";
    const { container } = render(<ResourceUrlCell url={url} />);
    const link = container.querySelector(`a[href="${url}"]`);
    expect(link).toBeTruthy();
    expect(container.textContent).toContain("not-a-url");
  });
});
