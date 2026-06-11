"use client";

import { useRef, type ReactNode, type RefObject } from "react";
import { CopyHtmlTableButton } from "@/features/page-speed-insights/tanstack-table-v9/CopyHtmlTableButton";
import { cn } from "@/lib/utils";

type TableWithCopyToolbarProps = {
  children: (props: { tableRef: RefObject<HTMLTableElement | null> }) => ReactNode;
  className?: string;
};

export function TableWithCopyToolbar({ children, className }: TableWithCopyToolbarProps) {
  const tableRef = useRef<HTMLTableElement>(null);

  return (
    <div className={cn("w-full", className)}>
      <div className="mb-2 flex justify-end">
        <CopyHtmlTableButton tableRef={tableRef} />
      </div>
      {children({ tableRef })}
    </div>
  );
}
