import * as React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { Timeline } from "@/features/page-speed-insights/Timeline";

vi.mock("@/components/ui/button", () => ({
  Button: ({ children, ...props }: { children: React.ReactNode }) => (
    <button type="button" {...props}>
      {children}
    </button>
  ),
}));

/** Normalize radix IDs to radix-_r_0_ for stable snapshots regardless of test order */
function normalizeRadixIds(html: string) {
  return html.replace(/radix-_r_\d+_/g, "radix-_r_0_");
}

describe("Timeline", () => {
  it("returns null when timeline is undefined", () => {
    const { container } = render(<Timeline />);
    expect(container.firstChild).toBeNull();
  });

  it("returns null when timeline has no items", () => {
    const { container } = render(
      <Timeline timeline={{ type: "filmstrip", items: [], scale: 1 }} />,
    );
    expect(container.firstChild).toBeNull();
  });

  it("returns null when timeline.items is undefined", () => {
    const { container } = render(<Timeline timeline={{ type: "filmstrip" } as any} />);
    expect(container.firstChild).toBeNull();
  });

  it("renders timeline with device label", () => {
    const timeline = {
      type: "filmstrip" as const,
      items: [
        { data: "data:image/png;base64,a", timestamp: 0, timing: 100 },
        { data: "data:image/png;base64,b", timestamp: 100, timing: 200 },
      ],
      scale: 1,
    };
    const { container } = render(<Timeline timeline={timeline} device="Mobile" />);
    const html = (container.firstChild as HTMLElement)?.outerHTML ?? "";
    expect(normalizeRadixIds(html)).toMatchSnapshot();
  });

  it("renders timeline without device label", () => {
    const timeline = {
      type: "filmstrip" as const,
      items: [{ data: "data:image/png;base64,a", timestamp: 0, timing: 50 }],
      scale: 1,
    };
    const { container } = render(<Timeline timeline={timeline} />);
    const html = (container.firstChild as HTMLElement)?.outerHTML ?? "";
    expect(normalizeRadixIds(html)).toMatchSnapshot();
  });

  it("renders thumbnail buttons for each timeline item", () => {
    const timeline = {
      type: "filmstrip" as const,
      items: [
        { data: "data:image/png;base64,a", timestamp: 0, timing: 100 },
        { data: "data:image/png;base64,b", timestamp: 100, timing: 200 },
      ],
      scale: 1,
    };
    const { container } = render(<Timeline timeline={timeline} />);
    const html = (container.firstChild as HTMLElement)?.outerHTML ?? "";
    expect(normalizeRadixIds(html)).toMatchSnapshot();
  });

  it("labels frames with key paint timings", () => {
    const timeline = {
      type: "filmstrip" as const,
      items: [
        { data: "data:image/png;base64,a", timestamp: 0, timing: 300 },
        { data: "data:image/png;base64,b", timestamp: 100, timing: 1200 },
        { data: "data:image/png;base64,c", timestamp: 200, timing: 2500 },
      ],
      scale: 1,
    };
    const { getByText } = render(
      <Timeline
        timeline={timeline}
        markers={[
          { label: "FCP", timeMs: 1100 },
          { label: "LCP", timeMs: 2400 },
        ]}
      />,
    );
    expect(getByText("FCP")).toBeTruthy();
    expect(getByText("LCP")).toBeTruthy();
  });

  it("opens a full-screen viewer on click and steps between frames", () => {
    const timeline = {
      type: "filmstrip" as const,
      items: [
        { data: "data:image/png;base64,a", timestamp: 0, timing: 100 },
        { data: "data:image/png;base64,b", timestamp: 100, timing: 200 },
      ],
      scale: 1,
    };
    render(<Timeline timeline={timeline} device="Mobile" />);
    expect(screen.queryByRole("dialog")).toBeNull();

    fireEvent.click(screen.getByLabelText("Open full-screen view at 200 ms"));
    const dialog = screen.getByRole("dialog");
    expect(dialog.textContent).toContain("Frame 2 of 2");

    fireEvent.keyDown(dialog, { key: "ArrowLeft" });
    expect(dialog.textContent).toContain("Frame 1 of 2");

    fireEvent.click(screen.getByText("Next frame"));
    expect(dialog.textContent).toContain("Frame 2 of 2");
  });
});
