import { Button } from "@/components/ui/button";
import type { Header, RowData } from "@tanstack/react-table-v9";
import type { StandardTableFeatures } from "@/features/page-speed-insights/tanstack-table-v9/features";

const IconMap: Record<string, string> = {
  asc: "↑",
  desc: "↓",
};

export function SortingButton<TData extends RowData>({
  header,
}: {
  header: Header<StandardTableFeatures, TData, unknown>;
}) {
  if (!header.column.getCanSort()) {
    return null;
  }
  return (
    <Button
      type="button"
      variant={"ghost"}
      size={"icon"}
      onClick={header.column.getToggleSortingHandler()}
      title={
        header.column.getNextSortingOrder() === "asc"
          ? "Sort ascending"
          : header.column.getNextSortingOrder() === "desc"
            ? "Sort descending"
            : "Clear sort"
      }
    >
      {IconMap[header.column.getIsSorted() as string] ?? "〰︎"}
    </Button>
  );
}
