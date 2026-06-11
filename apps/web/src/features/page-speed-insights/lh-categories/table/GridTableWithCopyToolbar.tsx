"use client";

import { useRef, type ReactNode, type RefObject } from "react";
import { CopyGridTableButton } from "@/features/page-speed-insights/tanstack-table-v9/CopyGridTableButton";
import { cn } from "@/lib/utils";

type GridTableWithCopyToolbarProps = {
  children: (props: { containerRef: RefObject<HTMLDivElement | null> }) => ReactNode;
  className?: string;
};

export function GridTableWithCopyToolbar({ children, className }: GridTableWithCopyToolbarProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  return (
    <div className={cn("w-full", className)}>
      <div className="mb-2 flex justify-end">
        <CopyGridTableButton containerRef={containerRef} />
      </div>
      {children({ containerRef })}
    </div>
  );
}
