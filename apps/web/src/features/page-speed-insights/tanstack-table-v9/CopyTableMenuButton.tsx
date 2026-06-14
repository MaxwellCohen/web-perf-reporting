"use client";

import { Check, Copy } from "lucide-react";
import { useTransition } from "react";
import { Button, type ButtonProps } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

export type CopyTableFormat = "csv" | "markdown";

type CopyTableMenuButtonProps = Omit<ButtonProps, "onClick"> & {
  getCopyText: (format: CopyTableFormat) => string | null;
  resetDelay?: number;
};

export function CopyTableMenuButton({
  getCopyText,
  className,
  variant = "outline",
  size = "icon",
  children,
  resetDelay = 2000,
  ...props
}: CopyTableMenuButtonProps) {
  const [hasCopied, startCopyTransition] = useTransition();

  const onCopy = (format: CopyTableFormat) => {
    startCopyTransition(async () => {
      try {
        if (hasCopied) {
          return;
        }
        const text = getCopyText(format);
        if (!text) {
          return;
        }
        await navigator.clipboard.writeText(text);
        startCopyTransition(async () => {
          await new Promise((resolve) => setTimeout(resolve, resetDelay));
        });
      } catch {
        // clipboard may be unavailable (non-secure context, permissions)
      }
    });
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant={variant}
          size={size}
          className={cn("relative", className)}
          title="Copy table"
          {...props}
        >
          {hasCopied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
          {children}
          <span className="sr-only">Copy table</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onSelect={() => onCopy("csv")}>Copy as CSV</DropdownMenuItem>
        <DropdownMenuItem onSelect={() => onCopy("markdown")}>Copy as Markdown</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
