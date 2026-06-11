"use client";

import { Check, Copy } from "lucide-react";
import { useTransition } from "react";
import type { RowData } from "@tanstack/react-table-v9";
import { Button, type ButtonProps } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { StockTable } from "@/features/page-speed-insights/shared/tanstackStockTypes";
import { tableToCsv } from "@/features/page-speed-insights/tanstack-table-v9/tableToCsv";

type CopyTableButtonProps<TData extends RowData> = Omit<ButtonProps, "onClick"> & {
  table: StockTable<TData>;
  resetDelay?: number;
};

export function CopyTableButton<TData extends RowData>({
  table,
  className,
  variant = "outline",
  size = "icon",
  children,
  resetDelay = 2000,
  ...props
}: CopyTableButtonProps<TData>) {
  const [hasCopied, startCopyTransition] = useTransition();

  const onCopy = () => {
    startCopyTransition(async () => {
      try {
        if (hasCopied) {
          return;
        }
        await navigator.clipboard.writeText(tableToCsv(table));
        startCopyTransition(async () => {
          await new Promise((resolve) => setTimeout(resolve, resetDelay));
        });
      } catch {
        // clipboard may be unavailable (non-secure context, permissions)
      }
    });
  };

  return (
    <Button
      type="button"
      variant={variant}
      size={size}
      className={cn("relative", className)}
      onClick={onCopy}
      title="Copy table"
      {...props}
    >
      {hasCopied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
      {children}
      <span className="sr-only">Copy table</span>
    </Button>
  );
}
