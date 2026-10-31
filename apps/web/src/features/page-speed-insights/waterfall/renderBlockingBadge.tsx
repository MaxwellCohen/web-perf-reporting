import type { RenderBlockingStatus } from "@/features/page-speed-insights/page-load-timeline/types";
import { cn } from "@/lib/utils";

const RENDER_BLOCKING_LABEL: Record<RenderBlockingStatus, string> = {
  blocking: "Blocking",
  "potentially-blocking": "Potentially blocking",
  "non-blocking": "Non-blocking",
};

function renderBlockingClass(status: RenderBlockingStatus): string {
  if (status === "blocking") return "bg-rose-500/15 text-rose-700 dark:text-rose-300";
  if (status === "potentially-blocking") {
    return "bg-amber-500/15 text-amber-800 dark:text-amber-300";
  }
  return "bg-muted text-muted-foreground";
}

export function RenderBlockingBadge({
  status,
  compact = false,
  /** When true, also render the non-blocking chip (moment cards). */
  showNonBlocking = false,
}: {
  status: RenderBlockingStatus;
  compact?: boolean;
  showNonBlocking?: boolean;
}) {
  if (status === "non-blocking" && !showNonBlocking) return null;

  const label = compact
    ? status === "blocking"
      ? "Block"
      : status === "potentially-blocking"
        ? "Maybe"
        : "Non"
    : RENDER_BLOCKING_LABEL[status];

  return (
    <span
      className={cn(
        "rounded px-1 py-0.5 text-[10px] font-medium leading-none",
        !compact && "px-1.5",
        renderBlockingClass(status),
      )}
      data-testid="waterfall-blocking-badge"
    >
      {label}
    </span>
  );
}
