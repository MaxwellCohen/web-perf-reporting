"use client";

import type { ResourceStageId } from "@/features/page-speed-insights/dashboard-view/dashboardSearch";
import type { FlowStage } from "@/features/page-speed-insights/dashboard-view/resources-story/resourcesInvestigationModel";
import { cn } from "@/lib/cn";

const STAGE_CLASS: Record<ResourceStageId, string> = {
  arrived: "bg-foreground text-background",
  scripts: "bg-amber-500 text-black",
  unused: "bg-rose-700 text-white",
  "main-thread": "bg-slate-700 text-white dark:bg-slate-300 dark:text-slate-950",
};

export function PayloadFlow({
  stages,
  selectedId,
  onSelect,
}: {
  stages: FlowStage[];
  selectedId: ResourceStageId;
  onSelect: (id: ResourceStageId) => void;
}) {
  if (!stages.length) return null;

  return (
    <div className="space-y-2" role="group" aria-label="Download, then use">
      <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
        Download, then use
      </p>
      <div className="space-y-1.5">
        {stages.map((stage) => {
          const selected = stage.id === selectedId;
          return (
            <button
              key={stage.id}
              type="button"
              aria-pressed={selected}
              onClick={() => onSelect(stage.id)}
              className="block w-full text-left"
            >
              <span
                className={cn(
                  "flex min-h-11 min-w-28 flex-col justify-center rounded-md px-3 py-1.5 transition-[width,opacity] duration-500",
                  STAGE_CLASS[stage.id],
                  selected
                    ? "opacity-100 ring-2 ring-foreground ring-offset-2 ring-offset-background"
                    : "opacity-80 hover:opacity-100",
                )}
                style={{ width: `${Math.min(100, Math.max(stage.bar * 100, 18))}%` }}
              >
                <span className="text-xs font-semibold uppercase tracking-wide">{stage.label}</span>
                <span className="truncate font-mono text-[11px] tabular-nums opacity-90">
                  {stage.caption}
                </span>
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
