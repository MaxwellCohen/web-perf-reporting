"use client";

import type { SuspectTag } from "@/features/page-speed-insights/dashboard-view/resources-story/resourcesComparisonModel";
import type {
  ActionHint,
  ResourceSuspect,
} from "@/features/page-speed-insights/dashboard-view/resources-story/resourcesInvestigationModel";
import { cn } from "@/lib/cn";

const ACTION_LABEL: Record<ActionHint, string> = {
  "remove-unused": "Look at code that never ran",
  "cut-weight": "Look at cutting this file's weight",
  defer: "Look at deferring this script",
  split: "Look at splitting this script",
  "third-party-audit": "Look at whether this third party earns its bytes",
};

const TAG_LABEL: Record<Exclude<SuspectTag, null>, string> = {
  new: "New",
  dropped: "Dropped",
};

export function SuspectList({
  suspects,
  selectedUrl,
  onSelect,
  tagFor,
  ariaLabel = "Investigate next",
}: {
  suspects: ResourceSuspect[];
  selectedUrl: string | null;
  onSelect: (url: string) => void;
  /** Compare mode: marks suspects that are new or dropped versus the other report. */
  tagFor?: (url: string) => SuspectTag;
  ariaLabel?: string;
}) {
  if (!suspects.length) {
    return <p className="text-sm text-muted-foreground">No single URL stood out.</p>;
  }

  return (
    <div className="space-y-3">
      <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
        Investigate next
      </p>
      <ol aria-label={ariaLabel} className="space-y-2">
        {suspects.map((suspect, index) => {
          const selected = suspect.url === selectedUrl;
          const tag = tagFor?.(suspect.url) ?? null;
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
                  <span className="flex min-w-0 items-center gap-2">
                    {tag ? (
                      <span
                        className={cn(
                          "shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium uppercase",
                          tag === "new"
                            ? "bg-rose-500/10 text-rose-700 dark:text-rose-300"
                            : "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
                        )}
                      >
                        {TAG_LABEL[tag]}
                      </span>
                    ) : null}
                    <span className="truncate text-sm font-medium">{suspect.label}</span>
                  </span>
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
