import React from "react";

import { cn } from "@/lib/cn";
import { forwardTableDiv } from "@/components/ui/tablePrimitives";

const Table = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & { wrapperClassName?: string }
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex flex-col w-full text-sm", className)}
    role="table"
    {...props}
  />
));
Table.displayName = "Table";

const TableHeader = forwardTableDiv("TableHeader", "rowgroup", "[&_div]:border-b");
const TableBody = forwardTableDiv("TableBody", "rowgroup", "[&_div:last-child]:border-0");
const TableFooter = forwardTableDiv(
  "TableFooter",
  "rowgroup",
  "flex flex-col border-t bg-muted/50 font-medium [&>div]:last:border-b-0",
);

const TableRow = forwardTableDiv(
  "TableRow",
  "row",
  "flex flex-row border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted border",
);

const TableHead = forwardTableDiv(
  "TableHead",
  "columnheader",
  "flex h-10 flex-row px-2 text-left align-middle font-medium text-muted-foreground",
);

const TableCell = forwardTableDiv("TableCell", "cell", "p-2 align-middle");
const TableCaption = forwardTableDiv("TableCaption", "caption", "mt-4 text-sm text-muted-foreground");

export { Table, TableHeader, TableBody, TableFooter, TableHead, TableRow, TableCell, TableCaption };
