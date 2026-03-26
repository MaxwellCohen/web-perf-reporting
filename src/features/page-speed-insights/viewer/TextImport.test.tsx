import { fireEvent, render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/components/ui/accordion", () => ({
  Details: ({ children, ...props }: React.HTMLAttributes<HTMLDetailsElement>) => (
    <details {...props}>{children}</details>
  ),
}));

import { JSONTextArea } from "@/features/page-speed-insights/viewer/TextImport";

const mockData = {
  lighthouseResult: { categories: {} },
  loadingExperience: {},
};

describe("JSONTextArea", () => {
  it("renders summary and textarea", () => {
    const { container } = render(<JSONTextArea data={[]} onUpdate={vi.fn()} />);
    expect(container.textContent).toContain("Enter the lighthouse JSON Data here");
    expect(container.querySelector("textarea")).toBeTruthy();
  });

  it("shows initial data when provided", () => {
    const { container } = render(<JSONTextArea data={[mockData as any]} onUpdate={vi.fn()} />);
    const textarea = container.querySelector("textarea");
    expect(textarea?.value).toContain("lighthouseResult");
  });

  it("calls onUpdate with parsed data when Show Report clicked", () => {
    const onUpdate = vi.fn();
    const { container } = render(<JSONTextArea data={[mockData as any]} onUpdate={onUpdate} />);
    const button = Array.from(container.querySelectorAll("button")).find(
      (b) => b.textContent?.trim() === "Show Report",
    );
    fireEvent.click(button!);
    expect(onUpdate).toHaveBeenCalledWith([expect.any(Object)]);
  });

  it("renders empty textarea when data is empty", () => {
    const { container } = render(<JSONTextArea data={[]} onUpdate={vi.fn()} />);
    const textarea = container.querySelector("textarea");
    expect(textarea?.value).toBe("");
  });
});
