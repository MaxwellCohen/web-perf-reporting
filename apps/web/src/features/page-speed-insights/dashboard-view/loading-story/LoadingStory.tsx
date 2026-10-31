"use client";
/* eslint-disable @next/next/no-img-element */

import { TriangleAlert } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  usePageSpeedItems,
  usePageSpeedSelector,
} from "@/features/page-speed-insights/PageSpeedContext";
import {
  LOAD_MOMENTS,
  frameIndexAt,
  loadingStoryFromLoads,
  stageCaption,
  type DeviceStory,
  type LoadingStory,
  type StoryMomentId,
  type TimingRow,
} from "@/features/page-speed-insights/dashboard-view/loading-story/loadingStoryModel";
import {
  collectTimelineSources,
  type CombinedLoad,
} from "@/features/page-speed-insights/page-load-timeline/collectTimelineSources";
import type { Rating } from "@/features/page-speed-insights/page-load-timeline/types";
import { selectPossibleLcpRemountMatches } from "@/features/page-speed-insights/network-metrics/possibleLcpRemount";
import { formatMs } from "@/features/page-speed-insights/shared/format";
import {
  FilmstripViewer,
  type FilmstripViewerFrame,
} from "@/features/page-speed-insights/shared/FilmstripViewer";
import { LCP_PHASE_COLORS } from "@/features/page-speed-insights/shared/lcpPhaseColors";
import { cn } from "@/lib/cn";

type RatingValue = Rating;

function ratingClass(rating?: RatingValue): string {
  if (rating === "good") return "text-emerald-600 dark:text-emerald-400";
  if (rating === "needs-improvement") return "text-amber-600 dark:text-amber-400";
  if (rating === "poor") return "text-rose-600 dark:text-rose-400";
  return "text-foreground";
}

function phaseColor(id: string): string {
  return LCP_PHASE_COLORS[id] ?? "bg-muted-foreground";
}

function momentMeta(id: StoryMomentId) {
  return LOAD_MOMENTS.find((moment) => moment.id === id) ?? LOAD_MOMENTS[2];
}

function shownFrameIndex(
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

function MomentRail({
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

function SingleMomentTime({ device, momentId }: { device: DeviceStory; momentId: StoryMomentId }) {
  const moment = device.moments.find((item) => item.id === momentId);
  if (!moment)
    return <span className="text-2xl font-semibold tabular-nums text-muted-foreground">—</span>;
  return (
    <span className={cn("text-2xl font-semibold tabular-nums", ratingClass(moment.rating))}>
      {formatMs(moment.timeMs)}
    </span>
  );
}

function DeviceMomentTime({ device, momentId }: { device: DeviceStory; momentId: StoryMomentId }) {
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

function momentLabelsByFrame(device: DeviceStory): string[][] {
  const labels = device.frames.map(() => [] as string[]);
  for (const moment of device.moments) {
    const index = frameIndexAt(device.frames, moment.timeMs);
    if (index < 0) continue;
    const short = momentMeta(moment.id).short;
    if (!labels[index].includes(short)) labels[index].push(short);
  }
  return labels;
}

function Filmstrip({
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

function PhaseBar({ device }: { device: DeviceStory }) {
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

function DeviceStage({
  device,
  momentId,
  override,
  onSelectFrame,
  onClearOverride,
}: {
  device: DeviceStory;
  momentId: StoryMomentId;
  override: number | undefined;
  onSelectFrame: (index: number) => void;
  onClearOverride: () => void;
}) {
  const moment = device.moments.find((item) => item.id === momentId);
  const meta = momentMeta(momentId);
  const index = shownFrameIndex(device, momentId, override);
  const frame = index == null ? undefined : device.frames[index];
  const overridden = override != null && frame != null;
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);
  const viewerFrames = useMemo<FilmstripViewerFrame[]>(() => {
    const labels = momentLabelsByFrame(device);
    return device.frames.map((item, i) => ({
      timeMs: item.timing,
      labels: labels[i],
      panes: [{ label: device.label, src: item.data }],
    }));
  }, [device]);
  const caption = stageCaption({
    momentLabel: meta.label,
    momentTime: moment?.timeMs,
    frameTime: frame?.timing,
    overridden,
  });

  return (
    <article className="flex min-w-0 flex-col gap-4 bg-card p-4 sm:p-5">
      <header className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold">{device.label}</h3>
          {device.simulationLabel ? (
            <p className="text-xs text-muted-foreground">Lab clock: {device.simulationLabel}</p>
          ) : null}
        </div>
        {caption.headlineMs != null ? (
          <p
            className={cn(
              "text-right text-2xl font-semibold tabular-nums",
              ratingClass(moment?.rating),
            )}
          >
            {formatMs(caption.headlineMs)}
          </p>
        ) : null}
      </header>

      {frame ? (
        <>
          <button
            type="button"
            aria-haspopup="dialog"
            onClick={() => setViewerIndex(index)}
            className="flex min-h-52 cursor-zoom-in items-center justify-center overflow-hidden rounded-lg border bg-muted/40"
            aria-label={`Enlarge ${device.label} screenshot at ${formatMs(frame.timing)}`}
          >
            <img
              src={frame.data}
              alt=""
              className="max-h-80 w-full object-contain object-top"
              decoding="async"
            />
          </button>
          <FilmstripViewer
            title={device.label}
            frames={viewerFrames}
            index={viewerIndex}
            onIndexChange={setViewerIndex}
            onClose={() => setViewerIndex(null)}
          />
        </>
      ) : (
        <p className="flex min-h-32 items-center justify-center rounded-lg border border-dashed text-sm text-muted-foreground">
          {device.frames.length ? "This moment was not recorded." : "No screenshots were captured."}
        </p>
      )}

      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium">{caption.title}</p>
          <p className="text-xs text-muted-foreground">{caption.detail}</p>
        </div>
        {overridden ? (
          <button
            type="button"
            onClick={onClearOverride}
            className="shrink-0 text-xs font-medium text-foreground underline-offset-4 hover:underline"
          >
            Show {meta.label}
          </button>
        ) : null}
      </div>

      {device.frames.length ? (
        <Filmstrip
          device={device}
          selectedIndex={index}
          momentId={momentId}
          onSelect={onSelectFrame}
        />
      ) : null}

      <PhaseBar device={device} />

      {device.lcpElementLabel || device.lcpSnippet ? (
        <div className="space-y-1">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Largest element
          </p>
          {device.lcpElementLabel ? <p className="text-sm">{device.lcpElementLabel}</p> : null}
          {device.lcpSnippet ? (
            <p className="line-clamp-3 break-all font-mono text-xs leading-5 text-sky-400">
              {device.lcpSnippet}
            </p>
          ) : null}
        </div>
      ) : null}
    </article>
  );
}

function TimingTable({
  story,
  momentId,
  onSelect,
}: {
  story: LoadingStory;
  momentId: StoryMomentId;
  onSelect: (id: StoryMomentId) => void;
}) {
  if (!story.rows.length) return null;

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <caption className="mb-3 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Every timing
        </caption>
        <thead>
          <tr className="border-b text-left text-xs text-muted-foreground">
            <th scope="col" className="pb-2 pr-4 font-medium">
              Moment
            </th>
            {story.devices.map((device) => (
              <th key={device.label} scope="col" className="pb-2 pr-4 font-medium">
                {device.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {story.rows.map((row) => (
            <TimingTableRow
              key={row.id}
              row={row}
              selected={row.moment && row.id === momentId}
              onSelect={row.moment ? () => onSelect(row.id as StoryMomentId) : undefined}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}

function TimingTableRow({
  row,
  selected,
  onSelect,
}: {
  row: TimingRow;
  selected: boolean;
  onSelect?: () => void;
}) {
  return (
    <tr className={cn("border-b border-border/60", selected && "bg-muted/50")}>
      <th scope="row" className="py-2.5 pr-4 text-left font-medium">
        {onSelect ? (
          <button type="button" onClick={onSelect} className="text-left">
            <span className="block">{row.label}</span>
            <span className="block text-xs font-normal text-muted-foreground">
              {row.description}
            </span>
          </button>
        ) : (
          <>
            <span className="block">{row.label}</span>
            <span className="block text-xs font-normal text-muted-foreground">
              {row.description}
            </span>
          </>
        )}
      </th>
      {row.cells.map((cell, index) => (
        <td key={index} className={cn("py-2.5 pr-4 tabular-nums", ratingClass(cell.rating))}>
          {cell.timeMs == null ? "—" : formatMs(cell.timeMs)}
        </td>
      ))}
    </tr>
  );
}

function LoadingStoryView({
  story,
  remountLabels,
}: {
  story: LoadingStory;
  remountLabels: string[];
}) {
  const [momentId, setMomentId] = useState(story.defaultMomentId);
  const [overrides, setOverrides] = useState<Record<string, number>>({});

  function selectMoment(id: StoryMomentId) {
    setMomentId(id);
    setOverrides({});
  }

  return (
    <section aria-label="Loading" className="overflow-hidden rounded-xl border bg-card">
      <div className="space-y-5 p-4 sm:p-6">
        {remountLabels.length ? (
          <Alert className="border-amber-200 bg-amber-50 text-amber-950 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-100">
            <TriangleAlert className="h-4 w-4" />
            <AlertTitle>Possible LCP remount</AlertTitle>
            <AlertDescription>
              {remountLabels.join(", ")}: text LCP, mostly element render delay, and observed LCP
              well after FCP. This can happen when hydration replaces DOM and Chrome re-records LCP.
              Confirm with a performance trace.
            </AlertDescription>
          </Alert>
        ) : null}
        <MomentRail story={story} momentId={momentId} onSelect={selectMoment} />
      </div>

      <div
        className={cn(
          "grid gap-px border-t bg-border",
          story.devices.length > 1 && "md:grid-cols-2",
        )}
      >
        {story.devices.map((device) => (
          <DeviceStage
            key={device.label}
            device={device}
            momentId={momentId}
            override={overrides[device.label]}
            onSelectFrame={(index) =>
              setOverrides((current) => ({ ...current, [device.label]: index }))
            }
            onClearOverride={() =>
              setOverrides((current) => {
                const next = { ...current };
                delete next[device.label];
                return next;
              })
            }
          />
        ))}
      </div>

      <div className="border-t p-4 sm:p-6">
        <TimingTable story={story} momentId={momentId} onSelect={selectMoment} />
      </div>
    </section>
  );
}

export function LoadingStory() {
  const items = usePageSpeedItems();
  const remounts = usePageSpeedSelector(selectPossibleLcpRemountMatches);
  const story = useMemo(() => {
    const loads = items
      .map((item) => collectTimelineSources(item))
      .filter((load): load is CombinedLoad => load != null);
    return loadingStoryFromLoads(loads);
  }, [items]);

  if (!story) {
    return (
      <p className="text-sm text-muted-foreground">
        This report has no load timings or screenshots.
      </p>
    );
  }

  return (
    <LoadingStoryView
      key={story.key}
      story={story}
      remountLabels={remounts.map((match) => match.label)}
    />
  );
}
