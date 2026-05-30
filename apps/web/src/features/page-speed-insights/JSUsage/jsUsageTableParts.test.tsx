import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ExpandRow, RenderBytesCell } from "@/features/page-speed-insights/JSUsage/jsUsageTableParts";

vi.mock("@/components/ui/button", () => ({
  Button: ({
    children,
    ...props
  }: React.PropsWithChildren<Record<string, unknown>>) => (
    <button type="button" {...props}>
      {children}
    </button>
  ),
}));

vi.mock("lucide-react", () => ({
  ChevronRightIcon: () => <span data-testid="chevron-right" />,
}));

vi.mock("@/features/page-speed-insights/lh-categories/table/RenderTableValue", () => ({
  RenderBytesValue: ({ value }: { value: number }) => (
    <span data-testid="bytes">{value} bytes</span>
  ),
}));

describe("jsUsageTableParts", () => {
  describe("ExpandRow", () => {
    it("renders placeholder when row is missing", () => {
      const { container } = render(<ExpandRow />);
      const el = container.firstElementChild;
      expect(el?.tagName).toBe("DIV");
      expect(el).toHaveClass("h-9", "w-9");
    });

    it("renders placeholder when row cannot expand", () => {
      const row = {
        getIsExpanded: () => false,
        getCanExpand: () => false,
        getToggleExpandedHandler: () => () => {},
      };
      const { container } = render(<ExpandRow row={row as any} />);
      const el = container.firstElementChild;
      expect(el?.tagName).toBe("DIV");
      expect(el).toHaveClass("h-9", "w-9");
    });

    it("renders expand button when row can expand", () => {
      const row = {
        getIsExpanded: () => false,
        getCanExpand: () => true,
        getToggleExpandedHandler: () => () => {},
      };
      render(<ExpandRow row={row as any} />);
      expect(screen.getByRole("button", { name: "Expand row" })).toHaveAttribute(
        "aria-expanded",
        "false",
      );
    });

    it("renders collapse label when expanded", () => {
      const row = {
        getIsExpanded: () => true,
        getCanExpand: () => true,
        getToggleExpandedHandler: () => () => {},
      };
      render(<ExpandRow row={row as any} />);
      expect(screen.getByRole("button", { name: "Collapse row" })).toHaveAttribute(
        "aria-expanded",
        "true",
      );
    });
  });

  describe("RenderBytesCell", () => {
    it("renders N/A for non-number value", () => {
      const { container } = render(
        <table>
          <tbody>
            <tr>
              <td>
                {RenderBytesCell({
                  getValue: () => "n/a",
                  row: {} as any,
                  column: {} as any,
                  table: {} as any,
                  renderValue: () => "n/a",
                } as any)}
              </td>
            </tr>
          </tbody>
        </table>,
      );
      expect(container.textContent).toContain("N/A");
    });

    it("renders bytes value for number", () => {
      const { container } = render(
        <table>
          <tbody>
            <tr>
              <td>
                {RenderBytesCell({
                  getValue: () => 1024,
                  row: {} as any,
                  column: {} as any,
                  table: {} as any,
                  renderValue: () => 1024,
                } as any)}
              </td>
            </tr>
          </tbody>
        </table>,
      );
      expect(container.textContent).toMatch(/1024 bytes/);
    });
  });
});
