"use client";
import { useMemo, type ReactNode } from "react";
import { TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  flexRender,
  Subscribe,
  type Header,
  type ReactTable,
  type RowData,
  type TableState,
} from "@tanstack/react-table-v9";
import { SortingButton } from "@/features/page-speed-insights/tanstack-table-v9/sortingButton";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ListFilter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StringFilterHeader } from "@/features/page-speed-insights/tanstack-table-v9/StringFilterHeader";
import { RangeFilter } from "@/features/page-speed-insights/tanstack-table-v9/RangeFilter";
import { ColumnResizer } from "@/features/page-speed-insights/tanstack-table-v9/columnResizer";
import { renderBoolean } from "@/features/page-speed-insights/lh-categories/renderBoolean";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import type { StandardTableFeatures } from "@/features/page-speed-insights/tanstack-table-v9/features";

export function DataTableHeader<TData extends RowData>({
  table,
}: {
  table: ReactTable<StandardTableFeatures, TData, TableState<StandardTableFeatures>>;
}) {
  return (
    <TableHeader>
      {table.getHeaderGroups().map((headerGroup) => {
        return (
          <TableRow key={headerGroup.id}>
            {headerGroup.headers.map((header) => (
              <DataTableHead key={header.id} header={header} />
            ))}
          </TableRow>
        );
      })}
    </TableHeader>
  );
}

function DataTableHead<TData extends RowData>({
  header,
}: {
  header: Header<StandardTableFeatures, TData, unknown>;
}) {
  const isExpanderColumn = header.column.id === "expander";

  return (
    <TableHead
      key={header.id}
      className="relative min-w-0 overflow-hidden"
      style={{
        width: `${header.getSize()}px`,
        ...(isExpanderColumn && {
          minWidth: `${header.getSize()}px`,
          maxWidth: `${header.getSize()}px`,
        }),
      }}
    >
      {isExpanderColumn ? (
        <div className="flex items-center justify-center py-1">
          {flexRender(header.column.columnDef.header, header.getContext())}
        </div>
      ) : (
        <>
          <div className="flex min-w-0 flex-row flex-wrap items-center justify-between gap-x-2 gap-y-1">
            <div className="min-w-0 flex-1 overflow-hidden text-ellipsis *:truncate">
              {flexRender(header.column.columnDef.header, header.getContext())}
            </div>
            <div className="flex shrink-0 flex-row items-center gap-1">
              <SortingButton header={header} />
              <FilterPopover header={header} />
            </div>
          </div>
          <ColumnResizer header={header} />
        </>
      )}
    </TableHead>
  );
}

function FilterPopover<TData extends RowData>({
  header,
}: {
  header: Header<StandardTableFeatures, TData, unknown>;
}) {
  if (!header.column.getCanFilter()) {
    return null;
  }
  const filterType = header.column.columnDef.filterFn as string;
  const map: Record<string, () => ReactNode> = {
    includesString: () => <StringFilterHeader column={header.column} name={""} />,
    booleanFilterFn: () => <CheckBoxFilter header={header} />,
    inNumberRange: () => <RangeFilter column={header.column} />,
  };
  if (!(filterType in map)) {
    return null;
  }

  const filterComponent = map[filterType];
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button type="button" variant={"ghost"} size={"icon"}>
          <ListFilter />
        </Button>
      </PopoverTrigger>
      <PopoverContent>
        <div className="border-muted-foreground/30 flex max-h-72 flex-col overflow-y-auto rounded-sm border bg-black p-4">
          {filterComponent()}
        </div>
      </PopoverContent>
    </Popover>
  );
}

function CheckBoxFilter<TData extends RowData>({
  header,
}: {
  header: Header<StandardTableFeatures, TData, unknown>;
}) {
  const col = header.column;
  const table = header.getContext().table;
  const sortedUniqueValues = useMemo(
    () =>
      Array.from(col?.getFacetedUniqueValues()?.keys() || [])
        .sort()
        .slice(0, 5000),
    [col],
  );

  return (
    <Subscribe source={table.atoms.columnFilters}>
      {() => {
        const filterValue = (col.getFilterValue() as boolean[]) || [...sortedUniqueValues];

        return (
          <div className="flex flex-col gap-2">
            {sortedUniqueValues.map((v) => {
              return (
                <Label key={`${v}`} className="flex flex-row items-center gap-3">
                  <Checkbox
                    checked={
                      filterValue.length ? filterValue.findIndex((a) => !!a === !!v) > -1 : true
                    }
                    onCheckedChange={(checked: unknown) => {
                      col.setFilterValue((oldValue: boolean[] | undefined) => {
                        const previousValue = oldValue?.length
                          ? oldValue
                          : [...sortedUniqueValues];
                        return checked
                          ? [...new Set([...previousValue, !!v])]
                          : previousValue?.filter((a) => !!a !== !!v);
                      });
                    }}
                  ></Checkbox>
                  {typeof v === "string" ? v : renderBoolean(!!v)}
                </Label>
              );
            })}
          </div>
        );
      }}
    </Subscribe>
  );
}
