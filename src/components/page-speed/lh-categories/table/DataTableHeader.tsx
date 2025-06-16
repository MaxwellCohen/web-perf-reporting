'use client';
import { useMemo, ReactNode } from 'react';
import { TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { flexRender, Header, Table as TableType } from '@tanstack/react-table';

import { renderBoolean } from '@/components/page-speed/lh-categories/renderBoolean';
import { SortingButton } from '@/components/page-speed/lh-categories/table/sortingButton';
import { Popover } from '@/components/ui/popover';
import { PopoverContent, PopoverTrigger } from '@radix-ui/react-popover';
import { ListFilter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { RangeFilter, StringFilterHeader } from '@/components/page-speed/JSUsage/JSUsageTable';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { ColumnResizer } from '@/components/page-speed/lh-categories/table/columnResizer';

export function DataTableHeader<T>({ table }: { table: TableType<T> }) {
  'use no memo';
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

export function DataTableHead<T>({ header }: { header: Header<T, unknown> }) {
  'use no memo';
  return (
    <TableHead
      key={header.id}
      className="relative"
      style={{
        width: `${header.getSize()}px`,
      }}
    >
      <div className="flex flex-row items-center justify-between py-2">
        {flexRender(header.column.columnDef.header, header.getContext())}
        <div>
          <SortingButton header={header} />
          <FilterPopover header={header} />
        </div>
      </div>
      <ColumnResizer header={header} />
    </TableHead>
  );
}

function FilterPopover<T>({ header }: { header: Header<T, unknown> }) {
  'use no memo';
  if (!header.column.getCanFilter()) {
    return null;
  }
  const filterType = header.column.columnDef.filterFn as string;
  const map: Record<string, () => ReactNode> = {
    includesString: () => (
      <StringFilterHeader column={header.column} name={''} />
    ),
    booleanFilterFn: () => <CheckBoxFilter header={header} />,
    inNumberRange: () => <RangeFilter column={header.column} />
  };
  if (!(filterType in map)) {
    return null;
  }

  const filterComponent = map[filterType];
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button type="button" variant={'ghost'} size={'icon'}>
          <ListFilter />
        </Button>
      </PopoverTrigger>
      <PopoverContent>
        <div className="flex max-h-72 flex-col overflow-y-auto rounded-sm border border-muted-foreground/30 bg-black p-4">
          {filterComponent()}
        </div>
      </PopoverContent>
    </Popover>
  );
}

function CheckBoxFilter<T>({ header }: { header: Header<T, unknown> }) {
  const col = header.column;
  const sortedUniqueValues = useMemo(
    () =>
      Array.from(col?.getFacetedUniqueValues()?.keys() || [])
        .sort()
        .slice(0, 5000),
    [col],
  );
  const filterValue = (col.getFilterValue() as string[]) || [
    ...sortedUniqueValues,
  ];

  return (
    <div className="flex flex-col gap-2">
      {sortedUniqueValues.map((v) => {
        return (
          <Label key={`${v}`} className="flex flex-row items-center gap-3">
            <Checkbox
              checked={
                filterValue.length
                  ? filterValue.findIndex((a) => !!a === !!v) > -1
                  : true
              }
              onCheckedChange={(checked: unknown) => {
                col.setFilterValue((oldValue: string[]) => {
                  console.log(oldValue);
                  let previousValue = oldValue;
                  if (oldValue?.length) {
                    previousValue = oldValue;
                  } else {
                    previousValue = [...sortedUniqueValues];
                  }

                  const newFilter = checked
                    ? [...new Set([...previousValue, !!v])]
                    : previousValue?.filter((a) => !!a !== !!v);
                  return newFilter;
                });
              }}
            ></Checkbox>
            {typeof v === 'string' ? v : renderBoolean(!!v)}
          </Label>
        );
      })}
    </div>
  );
}
