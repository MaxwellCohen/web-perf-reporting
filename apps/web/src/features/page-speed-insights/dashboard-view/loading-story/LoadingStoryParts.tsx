"use client";
/* eslint-disable @next/next/no-img-element */

import { useEffect, useMemo, useRef } from "react";
import {} from "@/features/page-speed-insights/PageSpeedContext";
import {
  LOAD_MOMENTS,
  frameIndexAt,
  type DeviceStory,
  type LoadingStory,
  type StoryMomentId,
} from "@/features/page-speed-insights/dashboard-view/loading-story/loadingStoryModel";
import type { Rating } from "@/features/page-speed-insights/page-load-timeline/types";
import { formatMs } from "@/features/page-speed-insights/shared/format";
import { LCP_PHASE_COLORS } from "@/features/page-speed-insights/shared/lcpPhaseColors";
import { cn } from "@/lib/cn";

type RatingValue = Rating;

export function ratingClass(rating?: RatingValue): string {
  if (rating === "good") return "text-emerald-600 dark:text-emerald-400";
  if (rating === "needs-improvement") return "text-amber-600 dark:text-amber-400";
  if (rating === "poor") return "text-rose-600 dark:text-rose-400";
  return "text-foreground";
}

export function phaseColor(id: string): string {
  return LCP_PHASE_COLORS[id] ?? "bg-muted-foreground";
}

export function momentMeta(id: StoryMomentId) {
  return LOAD_MOMENTS.find((moment) => moment.id === id) ?? LOAD_MOMENTS[2];
}

export function shownFrameIndex(
  device: DeviceStory,
  momentId: StoryMomentId,
  override: number | undefined,
): number | null {
  if (override != null && override >= 0 && override < device.frames.length) return override;
  const time = device.moments.find((moment) => moment.id === momentId)?.timeMs;
  if (time == null || !device.frames.length) return null;
  const index = frameIndexAt(device.frames, time);
  return index >= 0 ? index : null;
}

export function MomentRail({
  story,
  momentId,
  onSelect,
}: {
  story: LoadingStory;
  momentId: StoryMomentId;
  onSelect: (id: StoryMomentId) => void;
}) {
  const selected = momentMeta(momentId);

  return (
    <div className="space-y-3">
      <div
        className="grid grid-cols-2 gap-2 lg:grid-cols-4"
        role="group"
        aria-label="Choose a load moment"
      >
        {LOAD_MOMENTS.map((moment) => {
          const pressed = moment.id === momentId;
          const recorded = story.devices.some((device) =>
            device.moments.some((item) => item.id === moment.id),
          );
          if (!recorded) return null;
          return (
            <button
              key={moment.id}
              type="button"
              aria-pressed={pressed}
              onClick={() => onSelect(moment.id)}
              className={cn(
                "flex min-w-0 flex-col gap-1.5 rounded-xl border px-3 py-3 text-left transition",
                pressed
                  ? "border-foreground/40 bg-muted/70"
                  : "border-border bg-background/40 hover:bg-muted/40",
              )}
            >
              <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                {moment.label}
              </span>
              {story.devices.length === 1 ? (
                <SingleMomentTime device={story.devices[0]} momentId={moment.id} />
              ) : (
                story.devices.map((device) => (
                  <DeviceMomentTime key={device.label} device={device} momentId={moment.id} />
                ))
              )}
            </button>
          );
        })}
      </div>
      <p className="text-sm text-muted-foreground">{selected.description}</p>
    </div>
  );
}

export function SingleMomentTime({
  device,
  momentId,
}: {
  device: DeviceStory;
  momentId: StoryMomentId;
}) {
  const moment = device.moments.find((item) => item.id === momentId);
  if (!moment)
    return <span className="text-2xl font-semibold tabular-nums text-muted-foreground">—</span>;
  return (
    <span className={cn("text-2xl font-semibold tabular-nums", ratingClass(moment.rating))}>
      {formatMs(moment.timeMs)}
    </span>
  );
}

export function DeviceMomentTime({
  device,
  momentId,
}: {
  device: DeviceStory;
  momentId: StoryMomentId;
}) {
  const moment = device.moments.find((item) => item.id === momentId);
  return (
    <span className="flex items-baseline justify-between gap-2">
      <span className="truncate text-xs text-muted-foreground">{device.label}</span>
      <span className={cn("text-sm font-semibold tabular-nums", ratingClass(moment?.rating))}>
        {moment ? formatMs(moment.timeMs) : "—"}
      </span>
    </span>
  );
}

export function momentLabelsByFrame(device: DeviceStory): string[][] {
  const labels = device.frames.map(() => [] as string[]);
  for (const moment of device.moments) {
    const index = frameIndexAt(device.frames, moment.timeMs);
    if (index < 0) continue;
    const short = momentMeta(moment.id).short;
    if (!labels[index].includes(short)) labels[index].push(short);
  }
  return labels;
}

export function Filmstrip({
  device,
  selectedIndex,
  momentId,
  onSelect,
}: {
  device: DeviceStory;
  selectedIndex: number | null;
  momentId: StoryMomentId;
  onSelect: (index: number) => void;
}) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<Array<HTMLButtonElement | null>>([]);

  useEffect(() => {
    const scroller = scrollerRef.current;
    const node = selectedIndex == null ? null : itemRefs.current[selectedIndex];
    if (!scroller || !node) return;
    const left = node.offsetLeft - scroller.clientWidth / 2 + node.clientWidth / 2;
    scroller.scrollTo({ left });
  }, [selectedIndex, momentId]);

  const frameLabels = useMemo(() => momentLabelsByFrame(device), [device]);

  return (
    <div
      ref={scrollerRef}
      className="flex gap-2 overflow-x-auto pb-1"
      aria-label={`${device.label} screenshots`}
    >
      {device.frames.map((frame, index) => {
        const selected = index === selectedIndex;
        const labels = frameLabels[index] ?? [];
        return (
          <button
            key={`${frame.timing}-${index}`}
            ref={(node) => {
              itemRefs.current[index] = node;
            }}
            type="button"
            aria-pressed={selected}
            aria-label={
              labels.length
                ? `${device.label} at ${formatMs(frame.timing)} (${labels.join(", ")})`
                : `${device.label} at ${formatMs(frame.timing)}`
            }
            onClick={() => onSelect(index)}
            className={cn(
              "w-[4.75rem] shrink-0 overflow-hidden rounded-md border p-1 text-left",
              selected ? "border-foreground bg-muted" : "border-border hover:bg-muted/40",
            )}
          >
            <img
              src={frame.data}
              alt=""
              className="h-16 w-full rounded-sm bg-muted object-contain object-top"
              loading="lazy"
              decoding="async"
            />
            <span className="mt-1 block text-center text-[10px] tabular-nums text-muted-foreground">
              {formatMs(frame.timing)}
            </span>
            {labels.length ? (
              <span className="block truncate text-center text-[10px] font-medium uppercase tracking-wide">
                {labels.join(" · ")}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}

export function PhaseBar({ device }: { device: DeviceStory }) {
  if (!device.phases.length) return null;
  const total = device.phases.reduce((sum, phase) => sum + phase.durationMs, 0);
  if (total <= 0) return null;

  return (
    <div className="space-y-2">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        Where largest-paint time went
      </p>
      <div className="flex h-2.5 overflow-hidden rounded-full bg-muted" aria-hidden>
        {device.phases.map((phase) => (
          <div
            key={phase.id}
            className={phaseColor(phase.id)}
            style={{ width: `${(phase.durationMs / total) * 100}%` }}
            title={`${phase.label} ${formatMs(phase.durationMs)}`}
          />
        ))}
      </div>
      <ul className="flex flex-wrap gap-x-4 gap-y-1">
        {device.phases.map((phase) => (
          <li key={phase.id} className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span className={cn("size-2 rounded-full", phaseColor(phase.id))} />
            <span>{phase.label}</span>
            <span className="tabular-nums text-foreground">{formatMs(phase.durationMs)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
