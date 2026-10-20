"use client";

import { useRef, useState, type PointerEvent } from "react";
import { formatMs } from "@/features/page-speed-insights/shared/format";
import { cn } from "@/lib/utils";

/** About 200 drag stops, and a divisor of the axis so the end thumb can sit on the trace end. */
export function timeRangeStep(axisEndMs: number): number {
  const target = Math.max(1, Math.round(axisEndMs / 200));
  for (let step = target; step > 1; step--) {
    if (axisEndMs % step === 0) return step;
  }
  return 1;
}

function snapTime(value: number, step: number, axisEndMs: number): number {
  if (value >= axisEndMs - step / 2) return axisEndMs;
  const snapped = Math.round(value / step) * step;
  return Math.min(axisEndMs, Math.max(0, snapped));
}

export function TimeRangeFilter({
  axisEndMs,
  startMs,
  endMs,
  onChange,
}: {
  axisEndMs: number;
  startMs: number;
  endMs: number;
  onChange: (startMs: number, endMs: number) => void;
}) {
  const step = timeRangeStep(axisEndMs);
  const trackRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<"start" | "end" | null>(null);
  const [focused, setFocused] = useState<"start" | "end" | null>(null);
  const filtering = startMs > 0 || endMs < axisEndMs;
  const startPct = axisEndMs > 0 ? (startMs / axisEndMs) * 100 : 0;
  const endPct = axisEndMs > 0 ? (endMs / axisEndMs) * 100 : 100;

  function move(which: "start" | "end", value: number) {
    if (which === "start") onChange(Math.max(0, Math.min(value, endMs - step)), endMs);
    else onChange(startMs, Math.min(axisEndMs, Math.max(value, startMs + step)));
  }

  function valueFromPointer(clientX: number): number {
    const rect = trackRef.current?.getBoundingClientRect();
    if (!rect || rect.width <= 0) return startMs;
    const ratio = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
    return snapTime(ratio * axisEndMs, step, axisEndMs);
  }

  function onPointerDown(event: PointerEvent<HTMLDivElement>) {
    if (event.button !== 0) return;
    const value = valueFromPointer(event.clientX);
    const which = Math.abs(value - startMs) <= Math.abs(value - endMs) ? "start" : "end";
    dragRef.current = which;
    try {
      event.currentTarget.setPointerCapture(event.pointerId);
    } catch {
      // jsdom and untrusted events have no active pointer to capture.
    }
    move(which, value);
  }

  function onPointerMove(event: PointerEvent<HTMLDivElement>) {
    if (!dragRef.current) return;
    move(dragRef.current, valueFromPointer(event.clientX));
  }

  function onPointerUp() {
    dragRef.current = null;
  }

  return (
    <div
      role="group"
      aria-label="Time range"
      data-testid="overview-time-range"
      className="flex w-full min-w-0 flex-1 items-center gap-2 sm:min-w-48 lg:min-w-64"
    >
      <span className="shrink-0 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
        Range
      </span>
      <div
        ref={trackRef}
        data-testid="overview-time-range-track"
        className="relative h-5 min-w-0 flex-1 cursor-ew-resize touch-none sm:h-4 sm:min-w-32"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        <div
          aria-hidden
          className="absolute inset-x-0 top-1/2 h-1 -translate-y-1/2 rounded-full bg-muted-foreground/30"
        />
        <div
          aria-hidden
          className="absolute top-1/2 h-1 -translate-y-1/2 rounded-full bg-foreground"
          style={{ left: `${startPct}%`, width: `${Math.max(0, endPct - startPct)}%` }}
        />
        <div
          aria-hidden
          className={cn(
            "absolute top-1/2 size-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-background bg-foreground shadow-sm",
            focused === "start" && "ring-2 ring-ring",
          )}
          style={{ left: `${startPct}%` }}
        />
        <div
          aria-hidden
          className={cn(
            "absolute top-1/2 size-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-background bg-foreground shadow-sm",
            focused === "end" && "ring-2 ring-ring",
          )}
          style={{ left: `${endPct}%` }}
        />
        <input
          type="range"
          aria-label="Range start"
          aria-valuetext={formatMs(startMs)}
          min={0}
          max={axisEndMs}
          step={step}
          value={startMs}
          onChange={(event) => move("start", Number(event.target.value))}
          onFocus={() => setFocused("start")}
          onBlur={() => setFocused(null)}
          className="sr-only"
        />
        <input
          type="range"
          aria-label="Range end"
          aria-valuetext={formatMs(endMs)}
          min={0}
          max={axisEndMs}
          step={step}
          value={endMs}
          onChange={(event) => move("end", Number(event.target.value))}
          onFocus={() => setFocused("end")}
          onBlur={() => setFocused(null)}
          className="sr-only"
        />
      </div>
      <span className="shrink-0 text-[10px] tabular-nums text-muted-foreground">
        {formatMs(startMs)}–{formatMs(endMs)}
      </span>
      {filtering ? (
        <button
          type="button"
          onClick={() => onChange(0, axisEndMs)}
          className="shrink-0 rounded border border-border bg-background px-1.5 py-0.5 text-[10px] font-medium focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        >
          Reset
        </button>
      ) : null}
    </div>
  );
}
