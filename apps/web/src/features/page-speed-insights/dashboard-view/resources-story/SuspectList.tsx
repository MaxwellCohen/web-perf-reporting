"use client";

import type {
  ActionHint,
  ResourceSuspect,
} from "@/features/page-speed-insights/dashboard-view/resources-story/resourcesInvestigationModel";
import { cn } from "@/lib/cn";

export const ACTION_LABEL: Record<ActionHint, string> = {
  "remove-unused": "Look at code that never ran",
  "cut-weight": "Look at cutting this file's weight",
  defer: "Look at deferring this script",
  split: "Look at splitting this script",
  "third-party-audit": "Look at whether this third party earns its bytes",
};

export function SuspectList({
  suspects,
  selectedUrl,
  onSelect,
}: {
  suspects: ResourceSuspect[];
  selectedUrl: string | null;
  onSelect: (url: string) => void;
}) {
  if (!suspects.length) {
    return <p className="text-sm text-muted-foreground">No single URL stood out.</p>;
  }

  return (
    <div className="space-y-3">
      <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
        Investigate next
      </p>
      <ol aria-label="Investigate next" className="space-y-2">
        {suspects.map((suspect, index) => {
          const selected = suspect.url === selectedUrl;
          return (
            <li key={suspect.url}>
              <button
                type="button"
                aria-pressed={selected}
                onClick={() => onSelect(suspect.url)}
                className={cn(
                  "flex w-full gap-3 rounded-lg border px-3 py-2.5 text-left transition",
                  selected
                    ? "border-foreground/50 bg-muted/70"
                    : "border-border bg-background/40 hover:bg-muted/40",
                )}
              >
                <span className="font-mono text-xs tabular-nums text-muted-foreground">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <span className="min-w-0 space-y-1">
                  <span className="block truncate text-sm font-medium">{suspect.label}</span>
                  <span className="block text-xs text-muted-foreground">{suspect.why}</span>
                  <span className="block text-xs font-medium text-foreground">
                    {ACTION_LABEL[suspect.actionHint]}
                  </span>
                </span>
              </button>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
