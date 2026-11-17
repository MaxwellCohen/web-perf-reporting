import type { Column } from "@tanstack/react-table";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { StringFilterHeader } from "@/features/page-speed-insights/tanstack-table-v9/StringFilterHeader";

vi.mock("@/components/ui/label", () => ({
  Label: ({ children, htmlFor }: { children: React.ReactNode; htmlFor?: string }) => (
    <label htmlFor={htmlFor}>{children}</label>
  ),
}));

vi.mock("@/components/ui/input", () => ({
  DebouncedInput: ({
    value,
    onChange,
    list,
    placeholder,
    id,
  }: {
    value: string;
    onChange: (v: string) => void;
    list?: string;
    placeholder?: string;
    id?: string;
  }) => (
    <input
      data-testid="filter-input"
      id={id}
      value={value}
      list={list}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
    />
  ),
}));

vi.mock("@/components/ui/button", () => ({
  Button: ({
    children,
    onClick,
    "aria-label": ariaLabel,
  }: {
    children: React.ReactNode;
    onClick?: () => void;
    "aria-label"?: string;
  }) => (
    <button type="button" onClick={onClick} aria-label={ariaLabel}>
      {children}
    </button>
  ),
}));

function createColumnMock(
  overrides: Partial<{
    id: string;
    getFacetedUniqueValues: () => Map<string, number>;
    getFilterValue: () => string;
    setFilterValue: (v: string) => void;
  }> = {},
) {
  const setFilterValue = vi.fn<() => void>();
  return {
    id: "name",
    getFacetedUniqueValues: () =>
      new Map([
        ["a", 1],
        ["b", 2],
        ["c", 3],
      ]),
    getFilterValue: () => "",
    setFilterValue,
    ...overrides,
  };
}

describe("StringFilterHeader", () => {
  it("returns null when column is undefined", () => {
    const { container } = render(<StringFilterHeader column={undefined} name="Name" />);
    expect(container.firstChild).toBeNull();
  });

  it("renders filter UI with column", () => {
    const column = createColumnMock();
    const { container } = render(<StringFilterHeader column={column as never} name="Name" />);
    expect(screen.getByLabelText("Name Filter")).toHaveAttribute("placeholder", "Search... (3)");
    expect(screen.getByRole("button", { name: "Clear filter for Name" })).toBeInTheDocument();
    expect(container.querySelectorAll("datalist option")).toHaveLength(3);
  });

  it("renders with filter value", () => {
    const column = createColumnMock({ getFilterValue: () => "test" });
    render(<StringFilterHeader column={column as never} name="Host" />);
    expect(screen.getByLabelText("Host Filter")).toHaveValue("test");
    expect(screen.getByRole("button", { name: "Clear filter for Host" })).toBeInTheDocument();
  });

  it("calls setFilterValue when clear button is clicked", () => {
    const column = createColumnMock();
    const { container } = render(<StringFilterHeader column={column as never} name="Name" />);
    const button = container.querySelector("button");
    fireEvent.click(button!);
    expect(column.setFilterValue).toHaveBeenCalledWith("");
  });

  it("wires input onChange to setFilterValue", () => {
    const column = createColumnMock();
    const { container } = render(<StringFilterHeader column={column as never} name="Name" />);
    const input = container.querySelector("input");
    fireEvent.change(input!, { target: { value: "foo" } });
    expect(column.setFilterValue).toHaveBeenCalledWith("foo");
  });

  it("associates datalist with input via list attribute", () => {
    const column = createColumnMock({ id: "host" });
    const { container } = render(<StringFilterHeader column={column as never} name="Host" />);
    const datalist = container.querySelector("datalist");
    const input = container.querySelector("input");
    expect(datalist?.id).toBeTruthy();
    expect(input?.getAttribute("list")).toBe(datalist?.id);
  });
});
