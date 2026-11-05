"use client";
/* eslint-disable @next/next/no-img-element */

import { TriangleAlert } from "lucide-react";
import { useMemo, useState } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  usePageSpeedItems,
  usePageSpeedSelector,
} from "@/features/page-speed-insights/PageSpeedContext";
import {
  loadingStoryFromLoads,
  stageCaption,
  type DeviceStory,
  type LoadingStory,
  type StoryMomentId,
} from "@/features/page-speed-insights/dashboard-view/loading-story/loadingStoryModel";
import {
  collectTimelineSources,
  type CombinedLoad,
} from "@/features/page-speed-insights/page-load-timeline/collectTimelineSources";
import { selectPossibleLcpRemountMatches } from "@/features/page-speed-insights/network-metrics/possibleLcpRemount";
import { formatMs } from "@/features/page-speed-insights/shared/format";
import {
  FilmstripViewer,
  type FilmstripViewerFrame,
} from "@/features/page-speed-insights/shared/FilmstripViewer";
import { cn } from "@/lib/cn";
import {
  ratingClass,
  momentMeta,
  shownFrameIndex,
  MomentRail,
  momentLabelsByFrame,
  Filmstrip,
  PhaseBar,
} from "./LoadingStoryParts";
import { TimingTable } from "./TimingTable";

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
