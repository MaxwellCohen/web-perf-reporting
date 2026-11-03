"use client";

import { cn } from "@/lib/utils";
import { getNetworkBarColor } from "@/features/page-speed-insights/shared/networkResourceColors";
import { toTitleCase } from "@/features/page-speed-insights/toTitleCase";
import { WATERFALL_SPECIAL_LEGEND } from "@/features/page-speed-insights/waterfall/WaterfallBarTrack";
import {
  isWaterfallSignalId,
  type WaterfallSignalId,
} from "@/features/page-speed-insights/waterfall/waterfallSignals";

const QUEUE_SWATCH =
  "bg-slate-400/60 bg-[repeating-linear-gradient(45deg,transparent,transparent_2px,rgba(0,0,0,0.06)_2px,rgba(0,0,0,0.06)_4px)] dark:bg-slate-500/50";
const CHAIN_SWATCH =
  "bg-sky-600/80 shadow-[inset_0_-2px_0_0] shadow-sky-950 ring-1 ring-sky-700 dark:bg-sky-300/70 dark:shadow-sky-100 dark:ring-sky-200";

function LegendSwatch({
  label,
  swatchClassName,
  wide = false,
}: {
  label: string;
  swatchClassName: string;
  wide?: boolean;
}) {
  return (
    <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground">
      <span
        className={cn("h-1.5 shrink-0 rounded-sm", wide ? "w-2.5" : "w-1.5", swatchClassName)}
      />
      {label}
    </span>
  );
}

function LegendSignalButton({
  id,
  label,
  swatchClassName,
  pressed,
  wide = false,
  onToggle,
}: {
  id: WaterfallSignalId;
  label: string;
  swatchClassName: string;
  pressed: boolean;
  wide?: boolean;
  onToggle: (id: WaterfallSignalId) => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      data-testid={`legend-signal-${id}`}
      onClick={() => onToggle(id)}
      className={cn(
        "inline-flex items-center gap-1 rounded-sm px-1 text-[10px] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
        pressed ? "bg-muted text-foreground ring-1 ring-foreground" : "text-muted-foreground",
      )}
    >
      <span
        className={cn("h-1.5 shrink-0 rounded-sm", wide ? "w-2.5" : "w-1.5", swatchClassName)}
      />
      {label}
    </button>
  );
}

export function ResourceTypeLegend({
  types,
  availableSignals,
  selectedSignals,
  onToggleSignal,
}: {
  types: string[];
  availableSignals: readonly WaterfallSignalId[];
  selectedSignals: readonly WaterfallSignalId[];
  onToggleSignal: (id: WaterfallSignalId) => void;
}) {
  const available = new Set(availableSignals);

  function signalItem(id: WaterfallSignalId, label: string, swatchClassName: string, wide = false) {
    if (!available.has(id) && !selectedSignals.includes(id)) {
      return <LegendSwatch key={id} label={label} swatchClassName={swatchClassName} wide={wide} />;
    }
    return (
      <LegendSignalButton
        key={id}
        id={id}
        label={label}
        swatchClassName={swatchClassName}
        wide={wide}
        pressed={selectedSignals.includes(id)}
        onToggle={onToggleSignal}
      />
    );
  }

  return (
    <div
      className="flex flex-wrap items-center gap-x-2 gap-y-0.5"
      data-testid="waterfall-resource-type-legend"
    >
      {types.map((type) => (
        <LegendSwatch
          key={type}
          label={toTitleCase(type)}
          swatchClassName={getNetworkBarColor(type)}
        />
      ))}
      {WATERFALL_SPECIAL_LEGEND.map((entry) =>
        isWaterfallSignalId(entry.key) ? signalItem(entry.key, entry.label, entry.className) : null,
      )}
      {signalItem("queue", "Queue", QUEUE_SWATCH, true)}
      {signalItem("chain", "Critical chain", CHAIN_SWATCH, true)}
    </div>
  );
}
