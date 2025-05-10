'use client';
import { TreeMapData, TreeMapNode } from '@/lib/schema';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardHeader } from '../ui/card';
import { RenderBytesValue } from './lh-categories/table/RenderTableValue';
import { Fragment, useContext, useMemo, useState } from 'react';
import { InsightsContext } from './PageSpeedContext';
import {
  CellContext,
  ColumnDef,
  ColumnFiltersState,
  ExpandedState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  HeaderContext,
  HeaderGroup,
  Row,
  SortingState,
  useReactTable,
  VisibilityState,
} from '@tanstack/react-table';
import { Button } from '../ui/button';
import { Input } from '../ui/input';

export function JSUsageSummary() {
  const items = useContext(InsightsContext);
  const treeDataArr = useMemo(
    () =>
      items
        .map(({ item, label }) => ({
          treeData: item.lighthouseResult?.audits?.['script-treemap-data']
            ?.details as TreeMapData,
          label,
        }))
        .filter(({ treeData }) => treeData?.type === 'treemap-data'),
    [items],
  );
  if (treeDataArr.length === 0) return null;
  return (
    <>
      {treeDataArr.map(({ treeData, label }, idx) => (
        <JSUsageCard key={`${idx}_label`} treeData={treeData} label={label} />
      ))}
    </>
  );
}

function ExpanderCell<T>({ row }: CellContext<T, unknown>) {
  'use no memo';
  return (
    <TableCell className="w-8">
      {row.getCanExpand() ? (
        <button
          {...{
            onClick: row.getToggleExpandedHandler(),
            style: { cursor: 'pointer' },
          }}
        >
          {row.getIsExpanded() ? '👇' : '👉'}
        </button>
      ) : (
        <>🔵</>
      )}
    </TableCell>
  );
}

function RenderBytesCell(info: CellContext<TreeMapNode, unknown>) {
  return (
    <TableCell className="w-36 text-right">
      {RenderBytesValue({
        value: info.getValue() || 0,
      })}
    </TableCell>
  );
}

function makeSortingHeading(name: string) {
  return function SortingHeader({
    column,
  }: HeaderContext<TreeMapNode, unknown>) {
    'use no memo';
    return (
      <TableHead className="w-36 text-right">
        {name}
        <Button
          variant="ghost"
          className="ml-1 px-0 text-right"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          aria-label={`Sort column ${name}`}
        >
          {column.getIsSorted()
            ? column.getIsSorted() === 'asc'
              ? ' ⇣'
              : ' ⇡'
            : '〰️'}
        </Button>
      </TableHead>
    );
  };
}

const columns: ColumnDef<TreeMapNode>[] = [
  {
    id: 'expander',
    header: () => <TableHead className="w-8"></TableHead>,
    cell: ExpanderCell,
  },
  {
    accessorKey: 'name',
    accessorFn: ({ name, duplicatedNormalizedModuleName }) =>
      `${name}${duplicatedNormalizedModuleName ? ` -- Duplicated Module` : ''}`,
    header: () => (
      <TableHead className="min-w-[18rem] max-w-[60vw] flex-row overflow-hidden whitespace-nowrap">
        Name
      </TableHead>
    ),
    cell: (info) => (
      <TableCell className="flex min-w-[18rem] max-w-[60vw] flex-row overflow-hidden whitespace-nowrap">
        <div className='w-full overflow-x-auto'>

        {(info?.row?.original?.unusedBytes || 0) > 51200 ? (
          <WarningSquare />
        ) : null}
        {info.getValue() as string}
        </div>
      </TableCell>
    ),
  },
  {
    accessorKey: 'resourceBytes',
    cell: RenderBytesCell,
    sortingFn: 'alphanumeric',
    enableSorting: true,
    enableMultiSort: false,
    //Resource Size
    header: makeSortingHeading('Resource Size'),
  },
  {
    accessorKey: 'unusedBytes',
    cell: RenderBytesCell,
    sortingFn: 'alphanumeric',
    enableSorting: true,
    enableMultiSort: false,
    header: makeSortingHeading('Unused Bytes'),
  },
  {
    accessorKey: 'percent',
    accessorFn: ({ resourceBytes = 0, unusedBytes = 0 }) => {
      const percent = (unusedBytes / resourceBytes) * 100;
      return percent;
    },
    cell: (info) => (
      <TableCell className="w-36 text-right">
        {((info.getValue() as number) || 0).toFixed(2)} %
      </TableCell>
    ),
    sortingFn: 'alphanumeric',
    enableSorting: true,
    enableMultiSort: false,
    header: makeSortingHeading('Percent'),
  },
];

function transformObject(obj: TreeMapNode) {
  const transformChildren = (children: TreeMapNode[], prefix = '') => {
    if (!children) {
      return [];
    }

    return children.reduce((acc, child: TreeMapNode) => {
      const { children: nestedChildren, name } = child;
      const newPrefix = prefix ? `${prefix}/${name}` : name;
      if (nestedChildren && Array.isArray(nestedChildren)) {
        transformChildren(nestedChildren, newPrefix).forEach(
          (transformedChild) => {
            acc.push(transformedChild);
          },
        );
      } else if (prefix) {
        acc.push({
          ...child,
          name: newPrefix,
        });
      } else {
        acc.push(child);
      }

      return acc;
    }, [] as TreeMapNode[]);
  };

  const newChildren = transformChildren(obj.children || []);

  return {
    ...obj,
    children: newChildren,
  };
}
function JSUsageCard({
  treeData,
  label,
}: {
  treeData: TreeMapData;
  label?: string;
}) {
  const nodes = useMemo(() => {
    const nodes = treeData.nodes;
    return nodes.map(transformObject);
  }, [treeData]);

  console.log(nodes);

  return (
    <Card className="sm:col-span-2 lg:col-span-full">
      <CardHeader className="text-center text-2xl font-bold">
        {label ? `JS Usage Summary for ${label}` : `JS Usage Summary`}
      </CardHeader>
      <JSUsageTable data={nodes} depth={0} />
    </Card>
  );
}

function useUseJSUsageTable(data: TreeMapData['nodes']) {
  'use no memo';
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [rowSelection, setRowSelection] = useState({});
  const [expanded, setExpanded] = useState<ExpandedState>(true);
  const table = useReactTable({
    columns,
    data: data,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    getRowCanExpand: (row) => !!row.original.children?.length,
    onExpandedChange: setExpanded,
    enableSorting: true,
    state: {
      pagination: {
        pageIndex: 0,
        pageSize: data.length,
      },
      sorting,
      columnFilters,
      columnVisibility,
      rowSelection,
      expanded: expanded,
    },
  });
  return table;
}

function JSUsageTable({
  data,
  depth = 0,
}: {
  data: TreeMapData['nodes'];
  label?: string;
  depth?: number;
}) {
  'use no memo';
  const table = useUseJSUsageTable(data);
  const rows = table.getRowModel().rows;

  return (
    <>
      {depth === 0 ? (
        <Input
          placeholder="Filter files..."
          value={(table.getColumn('name')?.getFilterValue() as string) ?? ''}
          onChange={(event) =>
            table.getColumn('name')?.setFilterValue(event.target.value)
          }
          className="mb-4 max-w-sm"
        />
      ) : null}
      <Table className="border-r-none -mr-0.5 max-w-full border-y-2 border-l-2 pr-0 pt-0">
        {depth === 0 ? (
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup, i) => (
              <JSUsageTableHeader
                key={`${headerGroup.id}_${i}_${depth}`}
                headerGroup={headerGroup}
                depth={depth}
                i={i}
              />
            ))}
          </TableHeader>
        ) : null}
        <TableBody className="flex-1">
          {rows?.length ? (
            rows.map((row, i) => (
              <JSUsageTableRow
                key={`${row.id}_${i}_${depth}`}
                row={row}
                depth={depth}
                i={i}
              />
            ))
          ) : (
            <NoResultsRow columns={columns} />
          )}
        </TableBody>
      </Table>
    </>
  );
}

function JSUsageTableHeader({
  headerGroup,
  depth,
  i,
}: {
  headerGroup: HeaderGroup<TreeMapNode>;
  depth: number;
  i: number;
}) {
  'use no memo';
  return (
    <TableRow key={`${headerGroup.id}_${i}_${depth}`} className="">
      {headerGroup.headers.map((header) => {
        return (
          <TableHead
            key={`${header.id}_${i}_${depth}`}
            suppressHydrationWarning
          >
            {header.isPlaceholder
              ? null
              : flexRender(header.column.columnDef.header, header.getContext())}
          </TableHead>
        );
      })}
    </TableRow>
  );
}

function JSUsageTableRow({
  row,
  depth,
  i,
}: {
  row: Row<TreeMapNode>;
  depth: number;
  i: number;
}) {
  'use no memo';

  return (
    <>
      <TableRow
        className="w-full px-0 py-0"
        data-state={row.getIsSelected() && 'selected'}
        data-children={row?.original?.children?.length || 0}
        suppressHydrationWarning
      >
        {row.getVisibleCells().map((cell) => {
          return (
            <Fragment key={`${cell.id}_${i}_${depth}`}>
              {flexRender(cell.column.columnDef.cell, cell.getContext())}
            </Fragment>
          );
        })}
      </TableRow>

      {row.getIsExpanded() && row.original.children ? (
        <TableCell
          className="border-x border-b-2 py-0 pr-0"
          colSpan={row.getVisibleCells().length}
          suppressHydrationWarning
        >
          <Table>
            <TableBody>
              <JSUsageTableSubRow
                key={`${row.id}_${i}_${depth}_children`}
                data={row.original.children}
                depth={depth + 1}
              />
            </TableBody>
          </Table>
        </TableCell>
      ) : null}
    </>
  );
}

function JSUsageTableSubRow({
  data,
  depth = 0,
}: {
  data: TreeMapNode[];
  depth: number;
}) {
  'use no memo';
  const table = useUseJSUsageTable(data);
  const rows = table.getRowModel().rows;
  return (
    <>
      {rows?.length
        ? rows.map((row, i) => (
            <JSUsageTableRow
              key={`${row.id}_${i}_${depth}`}
              row={row}
              depth={depth}
              i={i}
            />
          ))
        : null}
    </>
  );
}

function NoResultsRow({ columns }: { columns: ColumnDef<TreeMapNode>[] }) {
  return (
    <TableRow>
      <TableCell colSpan={columns.length} className="h-24 text-center">
        No results.
      </TableCell>
    </TableRow>
  );
}


function WarningSquare() {
  return (
    <div className="mr-2 h-3 w-3 self-center rounded-full bg-yellow-500">
      <span className="sr-only">warning this function could have extra JS</span>
    </div>
  );
}
