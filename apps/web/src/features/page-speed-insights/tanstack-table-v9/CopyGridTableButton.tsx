"use client";

import type { RefObject } from "react";
import type { ButtonProps } from "@/components/ui/button";
import { CopyTableMenuButton } from "@/features/page-speed-insights/tanstack-table-v9/CopyTableMenuButton";
import { gridContainerToCsv } from "@/features/page-speed-insights/tanstack-table-v9/gridContainerToCsv";
import { gridContainerToMarkdown } from "@/features/page-speed-insights/tanstack-table-v9/gridContainerToMarkdown";

type CopyGridTableButtonProps = Omit<ButtonProps, "onClick"> & {
  containerRef: RefObject<HTMLElement | null>;
  resetDelay?: number;
};

export function CopyGridTableButton({ containerRef, ...props }: CopyGridTableButtonProps) {
  return (
    <CopyTableMenuButton
      getCopyText={(format) => {
        if (!containerRef.current) {
          return null;
        }
        return format === "csv"
          ? gridContainerToCsv(containerRef.current)
          : gridContainerToMarkdown(containerRef.current);
      }}
      {...props}
    />
  );
}
