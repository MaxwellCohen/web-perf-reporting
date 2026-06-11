"use client";

import { Check, Copy } from "lucide-react";
import { useTransition, type RefObject } from "react";
import { Button, type ButtonProps } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { gridContainerToCsv } from "@/features/page-speed-insights/tanstack-table-v9/gridContainerToCsv";

type CopyGridTableButtonProps = Omit<ButtonProps, "onClick"> & {
  containerRef: RefObject<HTMLElement | null>;
  resetDelay?: number;
};

export function CopyGridTableButton({
  containerRef,
  className,
  variant = "outline",
  size = "icon",
  children,
  resetDelay = 2000,
  ...props
}: CopyGridTableButtonProps) {
  const [hasCopied, startCopyTransition] = useTransition();

  const onCopy = () => {
    startCopyTransition(async () => {
      try {
        if (hasCopied || !containerRef.current) {
          return;
        }
        await navigator.clipboard.writeText(gridContainerToCsv(containerRef.current));
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
