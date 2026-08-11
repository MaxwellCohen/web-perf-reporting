import { cn } from "@/lib/utils";

/** Shared visual style for TanStack and CSS-grid column resizers. */
export function columnResizerClassName(isResizing = false): string {
  return cn(
    "absolute right-0 top-0 z-10 h-full w-1.5 cursor-col-resize touch-none select-none",
    "bg-muted/50 transition-opacity duration-200 hover:bg-muted",
    isResizing && "bg-muted",
  );
}
