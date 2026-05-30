import { fireEvent, render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("lucide-react", () => ({
  ChevronDown: () => <span data-testid="chevron" />,
}));

vi.mock("@/components/ui/dropdown-menu", () => ({
  DropdownMenu: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DropdownMenuTrigger: ({ children, asChild }: { children: React.ReactNode; asChild?: boolean }) =>
    asChild ? <>{children}</> : <button type="button">{children}</button>,
  DropdownMenuContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DropdownMenuCheckboxItem: ({
    children,
    checked,
    onCheckedChange,
  }: {
    children: React.ReactNode;
    checked?: boolean;
    onCheckedChange?: (checked: boolean) => void;
  }) => (
    <div role="checkbox" aria-checked={checked} onClick={() => onCheckedChange?.(!checked)}>
      {children}
    </div>
  ),
}));

import { FilterControls } from "@/features/page-speed-insights/RecommendationsSection/FilterControls";

const defaultProps = {
  categories: ["Performance", "Accessibility"],
  priorities: ["high", "medium", "low"],
  selectedCategories: [] as string[],
  selectedPriorities: [] as string[],
  onCategoriesChange: vi.fn(),
  onPrioritiesChange: vi.fn(),
  filteredCount: 5,
  totalCount: 10,
  onToggleAll: vi.fn(),
  expandedCount: 0,
  totalFiltered: 5,
};

describe("FilterControls", () => {
  it("renders default state", () => {
    const { container } = render(<FilterControls {...defaultProps} />);
    expect(container.firstChild).toMatchSnapshot();
  });

  it("renders Collapse All when all expanded", () => {
    const { container } = render(
      <FilterControls {...defaultProps} expandedCount={5} totalFiltered={5} />,
    );
    expect(container.firstChild).toMatchSnapshot();
  });

  it("renders Reset Filters when any filter is selected", () => {
    const { container } = render(
      <FilterControls {...defaultProps} selectedCategories={["Performance"]} />,
    );
    expect(container.firstChild).toMatchSnapshot();
  });

  it("calls onToggleAll when toggle button is clicked", () => {
    const onToggleAll = vi.fn();
    const { container } = render(<FilterControls {...defaultProps} onToggleAll={onToggleAll} />);
    const expandButton = container.querySelector("button");
    fireEvent.click(expandButton!);
    expect(onToggleAll).toHaveBeenCalledTimes(1);
  });

  it("calls onCategoriesChange and onPrioritiesChange when Reset Filters clicked", () => {
    const onCategoriesChange = vi.fn();
    const onPrioritiesChange = vi.fn();
    const { container } = render(
      <FilterControls
        {...defaultProps}
        selectedCategories={["Performance"]}
        onCategoriesChange={onCategoriesChange}
        onPrioritiesChange={onPrioritiesChange}
      />,
    );
    const resetButton = Array.from(container.querySelectorAll("button")).find(
      (btn) => btn.textContent?.trim() === "Reset Filters",
    );
    fireEvent.click(resetButton!);
    expect(onCategoriesChange).toHaveBeenCalledWith([]);
    expect(onPrioritiesChange).toHaveBeenCalledWith([]);
  });

  it("calls onCategoriesChange when category dropdown Clear clicked", () => {
    const onCategoriesChange = vi.fn();
    const { container } = render(
      <FilterControls
        {...defaultProps}
        selectedCategories={["Performance"]}
        onCategoriesChange={onCategoriesChange}
      />,
    );
    const categoryTrigger = Array.from(container.querySelectorAll("button")).find((b) =>
      b.textContent?.includes("Filter by Category"),
    );
    fireEvent.click(categoryTrigger!);
    const clearBtn = Array.from(container.querySelectorAll("button")).find(
      (b) => b.textContent?.trim() === "Clear",
    );
    fireEvent.click(clearBtn!);
    expect(onCategoriesChange).toHaveBeenCalledWith([]);
  });

  it("calls onPrioritiesChange when priority dropdown Clear clicked", () => {
    const onPrioritiesChange = vi.fn();
    const { container } = render(
      <FilterControls
        {...defaultProps}
        selectedPriorities={["high"]}
        onPrioritiesChange={onPrioritiesChange}
      />,
    );
    const priorityTrigger = Array.from(container.querySelectorAll("button")).find((b) =>
      b.textContent?.includes("Filter by Priority"),
    );
    fireEvent.click(priorityTrigger!);
    const clearBtns = Array.from(container.querySelectorAll("button")).filter(
      (b) => b.textContent?.trim() === "Clear",
    );
    fireEvent.click(clearBtns[1]!);
    expect(onPrioritiesChange).toHaveBeenCalledWith([]);
  });

  it("removes category when unchecked", () => {
    const onCategoriesChange = vi.fn();
    const { container } = render(
      <FilterControls
        {...defaultProps}
        selectedCategories={["Performance"]}
        onCategoriesChange={onCategoriesChange}
      />,
    );
    const categoryTrigger = Array.from(container.querySelectorAll("button")).find((b) =>
      b.textContent?.includes("Filter by Category"),
    );
    fireEvent.click(categoryTrigger!);
    const perfCheckbox = Array.from(container.querySelectorAll('[role="checkbox"]')).find((el) =>
      el.textContent?.includes("Performance"),
    );
    fireEvent.click(perfCheckbox!);
    expect(onCategoriesChange).toHaveBeenCalledWith([]);
  });
});
