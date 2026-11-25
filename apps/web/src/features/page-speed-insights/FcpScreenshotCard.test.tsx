import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { FcpScreenshotCard } from "@/features/page-speed-insights/FcpScreenshotCard";

const shot = { label: "Mobile", data: "data:image/jpeg;base64,a", timing: 1250, fcpMs: 1200 };

describe("FcpScreenshotCard", () => {
  it("shows the FCP value and the frame time beside the screenshot", () => {
    render(<FcpScreenshotCard screenshots={[shot]} />);

    expect(screen.getByRole("img")).toHaveAttribute("src", shot.data);
    expect(screen.getByText("First Contentful Paint").nextSibling).toHaveTextContent("1.20 s");
    expect(screen.getByText("Frame captured at").nextSibling).toHaveTextContent("1.25 s");
    expect(screen.queryByText(/The filmstrip/)).toBeNull();
  });

  it("says how much later the frame is when none was captured at FCP", () => {
    render(<FcpScreenshotCard screenshots={[{ ...shot, timing: 2630 }]} />);

    expect(
      screen.getByText("The filmstrip has no frame at FCP. This is the next one, 1.43 s later."),
    ).toBeInTheDocument();
  });

  it("says when the filmstrip ends before FCP", () => {
    render(<FcpScreenshotCard screenshots={[{ ...shot, timing: 800 }]} />);

    expect(
      screen.getByText("The filmstrip ends before FCP. This is its last frame, 400 ms earlier."),
    ).toBeInTheDocument();
  });

  it("labels each report when there is more than one", () => {
    render(<FcpScreenshotCard screenshots={[shot, { ...shot, label: "Desktop" }]} />);

    expect(screen.getByText("Mobile")).toBeInTheDocument();
    expect(screen.getByText("Desktop")).toBeInTheDocument();
  });

  it("opens the screenshot full screen on click", () => {
    render(<FcpScreenshotCard screenshots={[shot]} />);

    fireEvent.click(screen.getByRole("button", { name: /Open full screen: Mobile/ }));

    const dialog = screen.getByRole("dialog");
    expect(dialog).toHaveTextContent("Mobile at First Contentful Paint · frame at 1.25 s");
    expect(dialog.querySelector("img")).toHaveAttribute("src", shot.data);
  });
});
