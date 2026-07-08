"use client";

import { Button } from "@/components/ui/button";
import { ChevronRightIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import type { RowData } from "@tanstack/react-table";
import type { TreeMapNode } from "@/lib/schema";
import { RenderBytesValue } from "@/features/page-speed-insights/lh-categories/table/RenderTableValue";
import type {
  StockCellContext,
  StockRow,
  StockTable,
} from "@/features/page-speed-insights/shared/tanstackStockTypes";

function ExpandToggleButton({
  isExpanded,
  onClick,
  expandLabel,
  collapseLabel,
  children,
  size = "icon",
  ariaExpanded,
}: {
  isExpanded: boolean;
  onClick: () => void;
  expandLabel: string;
  collapseLabel: string;
  children?: React.ReactNode;
  size?: "icon" | "default";
  ariaExpanded?: boolean;
}) {
  const label = isExpanded ? collapseLabel : expandLabel;
  return (
    <Button
      variant="ghost"
      role="button"
      size={size}
      onClick={onClick}
      style={{ cursor: "pointer", margin: 0 }}
      aria-label={label}
      aria-expanded={ariaExpanded}
      className="m-0 h-8 w-8"
    >
      {children}
      <ChevronRightIcon
        className={cn("h-4 w-4 transform transition-all duration-300", {
          "rotate-90": isExpanded,
        })}
      />
      <span className="sr-only">{label}</span>
    </Button>
  );
}

export function ExpandRow<TData extends RowData>({
  row,
  children,
}: Pick<Partial<StockCellContext<TData, unknown>>, "row"> & {
  children?: React.ReactNode;
}) {
  if (!row) {
    return <div className="h-9 w-9" />;
  }

  const expandableRow = row as StockRow<TData>;
  const canExpand = expandableRow.getCanExpand();

  if (!canExpand) {
    return <div className="h-9 w-9" />;
  }
  const isExpanded = expandableRow.getIsExpanded();

  return (
    <ExpandToggleButton
      isExpanded={isExpanded}
      onClick={expandableRow.getToggleExpandedHandler()}
      expandLabel="Expand row"
      collapseLabel="Collapse row"
      size={children ? "default" : "icon"}
      ariaExpanded={isExpanded}
    >
      {children}
    </ExpandToggleButton>
  );
}

export function RenderBytesCell(info: StockCellContext<TreeMapNode, unknown>) {
  const value = info.getValue();

  if (typeof value !== "number") {
    return <div className="w-full text-right"> N/A</div>;
  }
  return <RenderBytesValue value={value} className="w-full text-right" />;
}

export function ExpandAll<TData extends RowData>({ table }: { table: StockTable<TData> }) {
  return (
    <ExpandToggleButton
      isExpanded={table.getIsAllRowsExpanded()}
      onClick={() => table.toggleAllRowsExpanded()}
      expandLabel="Expand all rows"
      collapseLabel="Collapse all rows"
    />
  );
}
