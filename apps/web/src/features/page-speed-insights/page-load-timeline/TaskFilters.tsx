"use client";

import { cn } from "@/lib/utils";
import {
  TASK_FILTER_LABEL,
  type TaskFilterId,
  type TaskFilterSelection,
} from "./filterTimelineMoments";

export function TaskFilters({
  options,
  enabled,
  shown,
  total,
  onToggle,
}: {
  options: TaskFilterId[];
  enabled: TaskFilterSelection;
  shown: number;
  total: number;
  onToggle: (id: TaskFilterId) => void;
}) {
  if (!options.length) return null;
  const filtering = shown !== total;

  return (
    <div
      role="group"
      aria-label="Filter timeline tasks"
      data-testid="timeline-task-filters"
      className="flex flex-wrap items-center gap-1.5"
    >
      <span className="mr-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        Tasks
      </span>
      {options.map((id) => {
        const pressed = enabled.has(id);
        return (
          <button
            key={id}
            type="button"
            aria-pressed={pressed}
            onClick={() => onToggle(id)}
            className={cn(
              "rounded-md border px-2 py-0.5 text-[11px] font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              pressed
                ? "border-transparent bg-white text-black"
                : "border-white/20 bg-black text-white",
            )}
          >
            {TASK_FILTER_LABEL[id]}
          </button>
        );
      })}
      {filtering ? (
        <span className="text-[11px] tabular-nums text-muted-foreground">
          {shown} of {total}
        </span>
      ) : null}
    </div>
  );
}
