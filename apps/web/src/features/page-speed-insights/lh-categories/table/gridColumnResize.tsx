"use client";

import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
  type ReactNode,
} from "react";
import type { TableColumnHeading } from "@/lib/schema";
import { showBothDevices } from "@/features/page-speed-insights/lh-categories/table/utils";
import { columnResizerClassName } from "@/features/page-speed-insights/tanstack-table-v9/columnResizerStyles";

type GridColumnResizeContextValue = {
  widths: number[];
  startResize: (columnIndex: number, event: ReactMouseEvent) => void;
};

const GridColumnResizeContext = createContext<GridColumnResizeContextValue | null>(null);

export function useGridColumnResize() {
  return useContext(GridColumnResizeContext);
}

function defaultColumnWidth(heading: TableColumnHeading): number {
  if (showBothDevices(heading) || heading.label === "Protocol") {
    return 140;
  }
  return 300;
}

export function getDefaultGridColumnWidths(headings: TableColumnHeading[]): number[] {
  return headings.map(defaultColumnWidth);
}

function headingsIdentity(headings: TableColumnHeading[]): string {
  return headings
    .map((h) => `${h.key ?? ""}:${typeof h.label === "string" ? h.label : ""}`)
    .join("|");
}

export function GridColumnResizeProvider({
  headings,
  children,
}: {
  headings: TableColumnHeading[];
  children: ReactNode;
}) {
  const headingKey = headingsIdentity(headings);
  const [widths, setWidths] = useState(() => getDefaultGridColumnWidths(headings));
  const dragRef = useRef<{
    columnIndex: number;
    startX: number;
    startWidth: number;
  } | null>(null);

  useEffect(() => {
    setWidths(getDefaultGridColumnWidths(headings));
    // Reset when the heading set changes; headings identity is captured in headingKey.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [headingKey]);

  const startResize = (columnIndex: number, event: ReactMouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    setWidths((current) => {
      const startWidth = current[columnIndex] ?? 120;
      dragRef.current = {
        columnIndex,
        startX: event.clientX,
        startWidth,
      };
      return current;
    });

    const onMove = (moveEvent: MouseEvent) => {
      const drag = dragRef.current;
      if (!drag) return;
      const delta = moveEvent.clientX - drag.startX;
      const nextWidth = Math.max(80, drag.startWidth + delta);
      setWidths((prev) => prev.map((w, i) => (i === drag.columnIndex ? nextWidth : w)));
    };

    const onUp = () => {
      dragRef.current = null;
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  };

  const value = {
    widths,
    startResize,
  };

  return (
    <GridColumnResizeContext.Provider value={value}>{children}</GridColumnResizeContext.Provider>
  );
}

export function gridTemplateColumnsFromWidths(widths: number[]): string {
  return widths.map((w) => `${w}px`).join(" ");
}

export function GridColumnResizer({ columnIndex }: { columnIndex: number }) {
  const ctx = useGridColumnResize();
  if (!ctx) return null;

  return (
    <div
      role="separator"
      aria-orientation="vertical"
      aria-label="Resize column"
      onMouseDown={(event) => ctx.startResize(columnIndex, event)}
      className={columnResizerClassName()}
    />
  );
}
