"use client";

import type { ReactNode, RefObject } from "react";
import { CopyHtmlTableButton } from "@/features/page-speed-insights/tanstack-table-v9/CopyHtmlTableButton";
import { WithCopyToolbar } from "@/features/page-speed-insights/tanstack-table-v9/WithCopyToolbar";

type TableWithCopyToolbarProps = {
  children: (props: { tableRef: RefObject<HTMLTableElement | null> }) => ReactNode;
  className?: string;
};

export function TableWithCopyToolbar({ children, className }: TableWithCopyToolbarProps) {
  return (
    <WithCopyToolbar<HTMLTableElement>
      className={className}
      renderButton={(tableRef) => <CopyHtmlTableButton tableRef={tableRef} />}
    >
      {(tableRef) => children({ tableRef })}
    </WithCopyToolbar>
  );
}
