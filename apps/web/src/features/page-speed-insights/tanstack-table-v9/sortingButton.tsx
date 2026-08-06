import { Button } from "@/components/ui/button";
import { Subscribe, type Header, type RowData } from "@tanstack/react-table";

const IconMap: Record<string, string> = {
  asc: "↑",
  desc: "↓",
};

export function SortingButton<TData extends RowData>({
  header,
}: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  header: Header<any, TData, unknown>;
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
            onClick={(event) => {
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
