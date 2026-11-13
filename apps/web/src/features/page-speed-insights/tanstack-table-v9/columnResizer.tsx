import type { Header, RowData } from "@tanstack/react-table";
import type { StockFeatures } from "@/features/page-speed-insights/shared/tanstackStockTypes";
import { cn } from "@/lib/utils";

/** Shared visual style for TanStack and CSS-grid column resizers. */
function columnResizerClassName(isResizing = false): string {
  return cn(
    "absolute right-0 top-0 z-10 h-full w-1.5 cursor-col-resize touch-none select-none",
    "bg-muted/50 transition-opacity duration-200 hover:bg-muted",
    isResizing && "bg-muted",
  );
}

export function ColumnResizer<TData extends RowData>({
  header,
}: {
  header: Header<StockFeatures, TData, unknown>;
}) {
  if (header.column.columnDef.enableResizing === false) {
    return null;
  }
  const handler = header.getResizeHandler();
  return (
    <div
      onDoubleClick={() => header.column.resetSize()}
      onMouseDown={handler}
      onTouchStart={handler}
      className={columnResizerClassName(header.column.getIsResizing())}
    />
  );
}
