import * as React from "react";

import { cn } from "@/lib/cn";
import { tableElementProps, withDisplayName } from "@/components/ui/tablePrimitives";

function forwardTableSection(
  element: "thead" | "tbody" | "tfoot",
  displayName: string,
  defaultClass: string,
) {
  const Comp = React.forwardRef<
    HTMLTableSectionElement,
    React.HTMLAttributes<HTMLTableSectionElement>
  >(({ className, ...props }, ref) =>
    React.createElement(
      element,
      tableElementProps<HTMLTableSectionElement, React.HTMLAttributes<HTMLTableSectionElement>>(
        defaultClass,
        className,
        ref,
        props,
      ),
    ),
  );
  return withDisplayName(Comp, displayName);
}

function forwardTableCell<E extends "th" | "td">(
  element: E,
  displayName: string,
  defaultClass: string,
) {
  type Props = E extends "th"
    ? React.ThHTMLAttributes<HTMLTableCellElement>
    : React.TdHTMLAttributes<HTMLTableCellElement>;
  const Comp = React.forwardRef<HTMLTableCellElement, Props>(
    ({ className, ...props }, ref) =>
      React.createElement(
        element,
        tableElementProps<HTMLTableCellElement, Props>(
          defaultClass,
          className,
          ref,
          props as unknown as Props,
        ),
      ),
  );
  return withDisplayName(Comp, displayName);
}

function forwardTableRow(displayName: string, defaultClass: string) {
  const Comp = React.forwardRef<HTMLTableRowElement, React.HTMLAttributes<HTMLTableRowElement>>(
    ({ className, ...props }, ref) =>
      React.createElement(
        "tr",
        tableElementProps<HTMLTableRowElement, React.HTMLAttributes<HTMLTableRowElement>>(
          defaultClass,
          className,
          ref,
          props,
        ),
      ),
  );
  return withDisplayName(Comp, displayName);
}

function forwardTableCaption(displayName: string, defaultClass: string) {
  const Comp = React.forwardRef<
    HTMLTableCaptionElement,
    React.HTMLAttributes<HTMLTableCaptionElement>
  >(({ className, ...props }, ref) =>
    React.createElement(
      "caption",
      tableElementProps<HTMLTableCaptionElement, React.HTMLAttributes<HTMLTableCaptionElement>>(
        defaultClass,
        className,
        ref,
        props,
      ),
    ),
  );
  return withDisplayName(Comp, displayName);
}

const Table = React.forwardRef<
  HTMLTableElement,
  React.HTMLAttributes<HTMLTableElement> & { wrapperClassName?: string }
>(({ className, wrapperClassName, ...props }, ref) => (
  <div className={cn("relative w-full overflow-auto", wrapperClassName)}>
    <table
      ref={ref}
      className={cn("w-full caption-bottom text-sm table-fixed", className)}
      suppressHydrationWarning
      {...props}
    />
  </div>
));
Table.displayName = "Table";

const TableHeader = forwardTableSection("thead", "TableHeader", "[&_tr]:border-b");
const TableBody = forwardTableSection("tbody", "TableBody", "[&_tr:last-child]:border-0");
const TableFooter = forwardTableSection(
  "tfoot",
  "TableFooter",
  "border-t bg-muted/50 font-medium [&>tr]:last:border-b-0",
);

const TableRow = forwardTableRow(
  "TableRow",
  "border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted",
);

const TableHead = forwardTableCell(
  "th",
  "TableHead",
  "h-10 px-2 text-left align-top font-medium text-muted-foreground [&:has([role=checkbox])]:pr-0 *:[[role=checkbox]]:translate-y-0.5 border",
);

const TableCell = forwardTableCell(
  "td",
  "TableCell",
  "p-2 align-top [&:has([role=checkbox])]:pr-0 *:[[role=checkbox]]:translate-y-0.5",
);

const TableCaption = forwardTableCaption("TableCaption", "mt-4 text-sm text-muted-foreground");

export { Table, TableHeader, TableBody, TableFooter, TableHead, TableRow, TableCell, TableCaption };
