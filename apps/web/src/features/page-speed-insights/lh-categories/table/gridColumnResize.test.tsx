import { describe, expect, it } from "vitest";
import { fireEvent, render } from "@testing-library/react";
import {
  GridColumnResizeProvider,
  GridColumnResizer,
  getDefaultGridColumnWidths,
  gridTemplateColumnsFromWidths,
  useGridColumnResize,
} from "@/features/page-speed-insights/lh-categories/table/gridColumnResize";
import type { TableColumnHeading } from "@/lib/schema";

const headings: TableColumnHeading[] = [
  { key: "a", valueType: "text", label: "A" },
  { key: "b", valueType: "text", label: "Protocol" },
];

function WidthProbe() {
  const ctx = useGridColumnResize();
  return <div data-testid="widths">{ctx?.widths.join(",")}</div>;
}

describe("gridColumnResize", () => {
  it("defaults protocol/device columns to 140px and others to 300px", () => {
    expect(getDefaultGridColumnWidths(headings)).toEqual([300, 140]);
    expect(gridTemplateColumnsFromWidths([300, 140])).toBe("300px 140px");
  });

  it("updates column width while dragging the resizer", () => {
    const { getByTestId, getByRole } = render(
      <GridColumnResizeProvider headings={headings}>
        <div className="relative">
          <GridColumnResizer columnIndex={0} />
        </div>
        <WidthProbe />
      </GridColumnResizeProvider>,
    );

    expect(getByTestId("widths").textContent).toBe("300,140");

    fireEvent.mouseDown(getByRole("separator"), { clientX: 100 });
    fireEvent.mouseMove(window, { clientX: 160 });
    fireEvent.mouseUp(window);

    expect(getByTestId("widths").textContent).toBe("360,140");
  });
});
