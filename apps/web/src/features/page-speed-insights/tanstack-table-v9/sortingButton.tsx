import { Button } from "@/components/ui/button";
import { Subscribe, type Header, type RowData } from "@tanstack/react-table";
import type { StockFeatures } from "@/features/page-speed-insights/shared/tanstackStockTypes";

const IconMap: Record<string, string> = {
  asc: "↑",
  desc: "↓",
};

export function SortingButton<TData extends RowData>({
  header,
}: {
  header: Header<StockFeatures, TData, unknown>;
}) {
  if (!header.column.getCanSort()) {
    return null;
  }

  const table = header.getContext().table;

  return (
    <Subscribe source={table.atoms.sorting}>
      {() => {
        const sorted = header.column.getIsSorted();
        const next = header.column.getNextSortingOrder();
        return (
          <Button
            type="button"
            variant={"ghost"}
            size={"icon"}
            className="relative z-20"
            onClick={(event) => {
              event.stopPropagation();
              header.column.getToggleSortingHandler()?.(event);
            }}
            title={
              next === "asc" ? "Sort ascending" : next === "desc" ? "Sort descending" : "Clear sort"
            }
          >
            {IconMap[sorted as string] ?? "〰︎"}
          </Button>
        );
      }}
    </Subscribe>
  );
}
