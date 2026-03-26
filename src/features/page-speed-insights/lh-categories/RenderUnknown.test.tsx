import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { RenderUnknown } from "@/features/page-speed-insights/lh-categories/RenderUnknown";

describe("RenderUnknown", () => {
  it("renders the unknown detail type and raw json", () => {
    const { container } = render(
      <RenderUnknown details={[{ type: "mystery-detail", items: [] } as any]} />,
    );

    expect(container.firstChild).toMatchSnapshot();
    expect(screen.getAllByText(/mystery-detail/)).toHaveLength(2);
  });

  it("falls back to an unknown type label when details are missing", () => {
    const { container } = render(<RenderUnknown details={[null]} />);

    expect(container.firstChild).toMatchSnapshot();
  });
});
