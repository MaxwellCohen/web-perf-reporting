/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import { useId, useMemo } from "react";
import type { HeaderContext } from "@tanstack/react-table";
import { Label } from "@/components/ui/label";
import { DebouncedInput } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const MAX_DATALIST_OPTIONS = 5000;

export function StringFilterHeader<T>({
  column,
  name,
}: Partial<Pick<HeaderContext<T, unknown>, "column">> & { name: string }) {
  const id = useId();
  const uniqueValues = column?.getFacetedUniqueValues();
  const sortedUniqueValues = useMemo(
    () =>
      uniqueValues ? Array.from(uniqueValues.keys()).sort().slice(0, MAX_DATALIST_OPTIONS) : [],
    [uniqueValues],
  );

  if (!column) {
    return null;
  }

  const uniqueCount = uniqueValues?.size ?? 0;
  const columnFilterValue = column?.getFilterValue();
  const datalistId = `${column.id}-list-${id}`;

  return (
    <div className="flex flex-col my-2">
      <Label htmlFor={`filter_${id}`} className="mb-2">
        {name} Filter
      </Label>
      <datalist id={datalistId}>
        {sortedUniqueValues.map((value: any) => (
          <option value={value} key={value} />
        ))}
      </datalist>
      <div className="flex flex-row">
        <DebouncedInput
          id={`filter_${id}`}
          type="text"
          value={(columnFilterValue ?? "") as string}
          onChange={(value) => column.setFilterValue(value)}
          placeholder={`Search... (${uniqueCount})`}
          className="rounded border shadow"
          list={datalistId}
          debounce={300}
        />
        <Button
          variant="ghost"
          className="ml-2"
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
