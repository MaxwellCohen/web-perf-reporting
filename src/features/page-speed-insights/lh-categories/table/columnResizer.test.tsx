import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import {
  ColumnResizer,
  useColumnSizeVars,
} from "@/features/page-speed-insights/lh-categories/table/columnResizer";
import type { Header, Table } from "@tanstack/react-table";

function createMockHeader(
  overrides: Partial<{
    getResizeHandler: () => (e: unknown) => void;
    getIsResizing: () => boolean;
    resetSize: () => void;
    columnDef: { enableResizing: boolean };
  }> = {},
): Header<unknown, unknown> {
  const resizeHandler = vi.fn();
  return {
    getResizeHandler: () => overrides.getResizeHandler?.() ?? resizeHandler,
    column: {
      columnDef: { enableResizing: overrides.columnDef?.enableResizing ?? true },
      getIsResizing: () => overrides.getIsResizing?.() ?? false,
      resetSize: overrides.resetSize ?? vi.fn(),
    },
  } as unknown as Header<unknown, unknown>;
}

describe("ColumnResizer", () => {
  it("returns null when enableResizing is false", () => {
    const header = createMockHeader({
      columnDef: { enableResizing: false },
    });
    const { container } = render(<ColumnResizer header={header} />);
    expect(container.firstChild).toBeNull();
  });

  it("renders resize handle when resizing enabled", () => {
    const header = createMockHeader();
    const { container } = render(<ColumnResizer header={header} />);
    expect(container.firstChild).toMatchSnapshot();
  });

  it("calls resize handler on mouse down", () => {
    const handler = vi.fn();
    const header = createMockHeader({ getResizeHandler: () => handler });
    render(<ColumnResizer header={header} />);
    const handle = document.querySelector(".cursor-col-resize");
    if (handle) fireEvent.mouseDown(handle);
    expect(handler).toHaveBeenCalled();
  });

  it("calls resetSize on double click", () => {
    const resetSize = vi.fn();
    const header = createMockHeader({ resetSize });
    render(<ColumnResizer header={header} />);
    const handle = document.querySelector(".cursor-col-resize");
    if (handle) fireEvent.doubleClick(handle);
    expect(resetSize).toHaveBeenCalled();
  });

  it("applies resizing background when column is resizing", () => {
    const header = createMockHeader({ getIsResizing: () => true });
    const { container } = render(<ColumnResizer header={header} />);
    expect(container.firstChild).toMatchSnapshot();
  });
});

describe("useColumnSizeVars", () => {
  it("returns object with column size vars from flat headers", () => {
    const mockTable = {
      getFlatHeaders: () => [
        {
          id: "col1",
          getSize: () => 100,
          column: { id: "col1", getSize: () => 100 },
        },
      ],
    } as unknown as Table<unknown>;
    // useColumnSizeVars is a hook; we need to call it from a component
    function TestComponent() {
      const vars = useColumnSizeVars(mockTable);
      return <div data-testid="vars">{JSON.stringify(vars)}</div>;
    }
    render(<TestComponent />);
    const el = screen.getByTestId("vars");
    expect(el.textContent).toContain("--header-col1-size");
    expect(el.textContent).toContain("--col-col1-size");
    expect(el.textContent).toContain("100");
  });
});
