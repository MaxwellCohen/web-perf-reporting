import type { Header, RowData } from "@tanstack/react-table";
import { columnResizerClassName } from "@/features/page-speed-insights/tanstack-table-v9/columnResizerStyles";

export function ColumnResizer<TData extends RowData>({
  header,
}: {
  header: Header<any, TData, unknown>;
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
