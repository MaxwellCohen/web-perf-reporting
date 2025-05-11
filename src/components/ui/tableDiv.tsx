import * as React from 'react';

import { cn } from '@/lib/utils';

// Table container using div and grid, with ARIA role
const Table = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & { wrapperClassName?: string }
>(({ className,  ...props }, ref) => (
  <div
    ref={ref}
    className={cn('flex flex-col w-full text-sm', className)}
    role="table"
    {...props}
  />
));
Table.displayName = 'Table';

// TableHeader as a rowgroup
const TableHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn('[&_div]:border-b', className)}
    role="rowgroup"
    {...props}
  />
));
TableHeader.displayName = 'TableHeader';

// TableBody as a rowgroup
const TableBody = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn('[&_div:last-child]:border-0', className)}
    role="rowgroup"
    {...props}
  />
));
TableBody.displayName = 'TableBody';

// TableFooter as a rowgroup
const TableFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      'flex flex-col border-t bg-muted/50 font-medium [&>div]:last:border-b-0',
      className,
    )}
    role="rowgroup"
    {...props}
  />
));
TableFooter.displayName = 'TableFooter';

// TableRow as a row
const TableRow = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      'flex flex-row border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted border',
      className,
    )}
    role="row"
    {...props}
  />
));
TableRow.displayName = 'TableRow';

// TableHead as a columnheader
const TableHead = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      'flex h-10 flex-row px-2 text-left align-middle font-medium text-muted-foreground',
      className,
    )}
    role="columnheader"
    {...props}
  />
));
TableHead.displayName = 'TableHead';

// TableCell as a cell
const TableCell = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn('p-2 align-middle', className)}
    role="cell"
    {...props}
  />
));
TableCell.displayName = 'TableCell';

// TableCaption as a caption
const TableCaption = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn('mt-4 text-sm text-muted-foreground', className)}
    role="caption"
    {...props}
  />
));
TableCaption.displayName = 'TableCaption';

export {
  Table,
  TableHeader,
  TableBody,
  TableFooter,
  TableHead,
  TableRow,
  TableCell,
  TableCaption,
};
