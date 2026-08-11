"use client";

import type { ReactNode, RefObject } from "react";
import { CopyGridTableButton } from "@/features/page-speed-insights/tanstack-table-v9/CopyGridTableButton";
import { WithCopyToolbar } from "@/features/page-speed-insights/tanstack-table-v9/WithCopyToolbar";

type GridTableWithCopyToolbarProps = {
  children: (props: { containerRef: RefObject<HTMLDivElement | null> }) => ReactNode;
  className?: string;
};

export function GridTableWithCopyToolbar({ children, className }: GridTableWithCopyToolbarProps) {
  return (
    <WithCopyToolbar<HTMLDivElement>
      className={className}
      renderButton={(containerRef) => <CopyGridTableButton containerRef={containerRef} />}
    >
      {(containerRef) => children({ containerRef })}
    </WithCopyToolbar>
  );
}
