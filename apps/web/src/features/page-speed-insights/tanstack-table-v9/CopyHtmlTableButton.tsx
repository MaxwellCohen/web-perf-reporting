"use client";

import type { RefObject } from "react";
import type { ButtonProps } from "@/components/ui/button";
import { CopyTableMenuButton } from "@/features/page-speed-insights/tanstack-table-v9/CopyTableMenuButton";
import { htmlTableToCsv } from "@/features/page-speed-insights/tanstack-table-v9/htmlTableToCsv";
import { htmlTableToMarkdown } from "@/features/page-speed-insights/tanstack-table-v9/htmlTableToMarkdown";

type CopyHtmlTableButtonProps = Omit<ButtonProps, "onClick"> & {
  tableRef: RefObject<HTMLTableElement | null>;
  resetDelay?: number;
};

export function CopyHtmlTableButton({ tableRef, ...props }: CopyHtmlTableButtonProps) {
  return (
    <CopyTableMenuButton
      getCopyText={(format) => {
        if (!tableRef.current) {
          return null;
        }
        return format === "csv"
          ? htmlTableToCsv(tableRef.current)
          : htmlTableToMarkdown(tableRef.current);
      }}
      {...props}
    />
  );
}
