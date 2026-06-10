import type { Header, RowData } from "@tanstack/react-table-v9";
import clsx from "clsx";
import type { StandardTableFeatures } from "@/features/page-speed-insights/tanstack-table-v9/features";

export function ColumnResizer<TData extends RowData>({
  header,
}: {
  header: Header<StandardTableFeatures, TData, unknown>;
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
      className={clsx(
        "absolute right-0 top-0 h-full w-1.5 cursor-col-resize touch-none select-none bg-muted/50 transition-opacity duration-200",
        {
          "bg-muted": header.column.getIsResizing(),
        },
      )}
    />
  );
}
