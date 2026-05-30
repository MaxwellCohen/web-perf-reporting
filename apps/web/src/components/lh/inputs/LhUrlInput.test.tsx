import * as React from "react";
import { act, fireEvent, render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/components/ui/tabs", () => ({
  Tabs: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  TabsList: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  TabsTrigger: ({ children }: { children: React.ReactNode }) => (
    <button type="button">{children}</button>
  ),
  TabsContent: ({ value, children }: { value: string; children: React.ReactNode }) => (
    <div role="tabpanel" data-value={value}>
      {children}
    </div>
  ),
}));

vi.mock("@/components/ui/input", () => ({
  Input: React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>((props, ref) => (
    <input ref={ref} {...props} />
  )),
}));

vi.mock("@/components/ui/label", () => ({
  Label: ({ children, ...props }: { children?: React.ReactNode; [k: string]: unknown }) => (
    <label {...props}>{children}</label>
  ),
}));

import { LhUrlInput } from "@/components/lh/inputs/LhUrlInput";

describe("LhUrlInput", () => {
  it("renders URL input", () => {
    const setJsonUrl = vi.fn();
    const { container } = render(<LhUrlInput jsonUrl="" setJsonUrl={setJsonUrl} />);
    expect(container.textContent).toContain("JSON URL");
    const input = container.querySelector("#json-url");
    expect(input).toHaveAttribute("type", "url");
    expect(input).toHaveAttribute("placeholder", "https://example.com/data.json");
    expect(container.firstChild).toMatchSnapshot();
  });

  it("displays current value", () => {
    const setJsonUrl = vi.fn();
    const { container } = render(
      <LhUrlInput jsonUrl="https://api.example.com/data.json" setJsonUrl={setJsonUrl} />,
    );
    expect(container.querySelector("#json-url")).toHaveValue("https://api.example.com/data.json");
  });

  it("calls setJsonUrl when input changed", async () => {
    const setJsonUrl = vi.fn();
    const { container } = render(<LhUrlInput jsonUrl="" setJsonUrl={setJsonUrl} />);
    await act(async () => {
      fireEvent.change(container.querySelector("#json-url")!, {
        target: { value: "https://test.com" },
      });
    });
    expect(setJsonUrl).toHaveBeenCalledWith("https://test.com");
  });
});
