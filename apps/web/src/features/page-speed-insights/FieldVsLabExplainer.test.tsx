import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { FieldVsLabExplainer } from "@/features/page-speed-insights/FieldVsLabExplainer";

describe("FieldVsLabExplainer", () => {
  it("renders a collapsed disclosure that explains field vs lab differences", () => {
    const { container } = render(<FieldVsLabExplainer />);
    const summary = screen.getByText("Why do field data and lab results differ?");
    expect(summary.tagName).toBe("SUMMARY");
    expect(container.querySelector("details")).not.toHaveAttribute("open");
    expect(screen.getByText(/Chrome UX Report/)).toBeInTheDocument();
    expect(screen.getByText(/single synthetic run/)).toBeInTheDocument();
  });
});
