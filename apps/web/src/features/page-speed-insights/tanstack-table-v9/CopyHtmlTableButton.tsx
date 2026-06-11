"use client";

import { Check, Copy } from "lucide-react";
import { useTransition, type RefObject } from "react";
import { Button, type ButtonProps } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { htmlTableToCsv } from "@/features/page-speed-insights/tanstack-table-v9/htmlTableToCsv";

type CopyHtmlTableButtonProps = Omit<ButtonProps, "onClick"> & {
  tableRef: RefObject<HTMLTableElement | null>;
  resetDelay?: number;
};

export function CopyHtmlTableButton({
  tableRef,
  className,
  variant = "outline",
  size = "icon",
  children,
  resetDelay = 2000,
  ...props
}: CopyHtmlTableButtonProps) {
  const [hasCopied, startCopyTransition] = useTransition();

  const onCopy = () => {
    startCopyTransition(async () => {
      try {
        if (hasCopied || !tableRef.current) {
          return;
        }
        await navigator.clipboard.writeText(htmlTableToCsv(tableRef.current));
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
