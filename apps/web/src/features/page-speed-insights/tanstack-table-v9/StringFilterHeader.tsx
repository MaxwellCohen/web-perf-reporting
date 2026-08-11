/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import { useId } from "react";
import type { HeaderContext, RowData } from "@tanstack/react-table";
import { Label } from "@/components/ui/label";
import { DebouncedInput } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const MAX_DATALIST_OPTIONS = 5000;

export function StringFilterHeader<TData extends RowData>({
  column,
  name,
}: Partial<Pick<HeaderContext<any, TData, unknown>, "column">> & {
  name: string;
}) {
  const id = useId();
  const uniqueValues = column?.getFacetedUniqueValues();
  const sortedUniqueValues = uniqueValues
    ? Array.from(uniqueValues.keys()).sort().slice(0, MAX_DATALIST_OPTIONS)
    : [];

  if (!column) {
    return null;
  }

  const uniqueCount = uniqueValues?.size ?? 0;
  const columnFilterValue = column?.getFilterValue();
  const datalistId = `${column.id}-list-${id}`;

  return (
    <div className="my-2 flex w-full min-w-0 flex-col">
      <Label htmlFor={`filter_${id}`} className="mb-2">
        {name} Filter
      </Label>
      <datalist id={datalistId}>
        {sortedUniqueValues.map((value: any) => (
          <option value={value} key={value} />
        ))}
      </datalist>
      <div className="flex min-w-0 flex-row items-center">
        <DebouncedInput
          id={`filter_${id}`}
          type="text"
          value={(columnFilterValue ?? "") as string}
          onChange={(value) => column.setFilterValue(value)}
          placeholder={`Search... (${uniqueCount})`}
          className="min-w-0 flex-1 rounded border shadow"
          list={datalistId}
          debounce={300}
        />
        <Button
          variant="ghost"
          className="ml-2 shrink-0"
          onClick={() => column.setFilterValue("")}
          aria-label={`Clear filter for ${name}`}
        >
          <span className="sr-only">Clear filter</span>
          <span aria-hidden="true">×</span>
        </Button>
      </div>
    </div>
  );
}
