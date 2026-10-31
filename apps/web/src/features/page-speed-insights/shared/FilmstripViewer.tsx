"use client";
/* eslint-disable @next/next/no-img-element */
import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { ChevronLeft, ChevronRight, Pause, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatMs } from "@/features/page-speed-insights/shared/format";
import { cn } from "@/lib/utils";

type FilmstripViewerPane = {
  /** Shown above the image when several runs are compared side by side. */
  label?: string;
  /** Null before the run has painted anything. */
  src: string | null;
  /** Actual frame time when it differs from the step time (aligned compare). */
  frameTimeMs?: number;
};

export type FilmstripViewerFrame = {
  timeMs: number;
  labels: string[];
  panes: FilmstripViewerPane[];
};

const PLAY_INTERVAL_MS = 700;

function thumbnailSrc(frame: FilmstripViewerFrame) {
  return frame.panes.find((pane) => pane.src)?.src ?? null;
}

/**
 * Full-screen frame viewer: one large frame (or one per compared run) with
 * prev/next, arrow-key + Home/End navigation, autoplay and a thumbnail rail.
 */
export function FilmstripViewer({
  title,
  frames,
  index,
  onIndexChange,
  onClose,
}: {
  title: string;
  frames: FilmstripViewerFrame[];
  /** Open frame, or null when closed. */
  index: number | null;
  onIndexChange: (index: number) => void;
  onClose: () => void;
}) {
  const [playing, setPlaying] = useState(false);
  const thumbRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const open = index !== null && frames.length > 0;
  const current = open ? Math.min(Math.max(index, 0), frames.length - 1) : 0;
  const frame = frames[current];
  const last = frames.length - 1;

  // Playback stops on its own at the last frame or when the viewer closes.
  const isPlaying = playing && open && current < last;

  useEffect(() => {
    if (!isPlaying) return;
    const timer = setTimeout(() => onIndexChange(current + 1), PLAY_INTERVAL_MS);
    return () => clearTimeout(timer);
  }, [isPlaying, current, onIndexChange]);

  useEffect(() => {
    if (!open) return;
    thumbRefs.current[current]?.scrollIntoView?.({ block: "nearest", inline: "center" });
  }, [open, current]);

  const go = (next: number) => {
    setPlaying(false);
    onIndexChange(Math.min(Math.max(next, 0), last));
  };

  const togglePlay = () => {
    if (isPlaying) {
      setPlaying(false);
      return;
    }
    if (current >= last) onIndexChange(0);
    setPlaying(true);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const keys: Record<string, () => void> = {
      ArrowLeft: () => go(current - 1),
      ArrowRight: () => go(current + 1),
      Home: () => go(0),
      End: () => go(last),
      " ": togglePlay,
    };
    const action = keys[event.key];
    if (!action) return;
    if (event.key === " " && event.target instanceof HTMLButtonElement) return;
    event.preventDefault();
    action();
  };

  const multi = (frame?.panes.length ?? 0) > 1;

  return (
    <Dialog open={open} onOpenChange={(next) => {
        if (next) return;
        setPlaying(false);
        onClose();
      }}>
      <DialogContent
        className="flex h-[95dvh] w-[96vw] max-w-[96vw] flex-col gap-3 p-3 sm:p-5"
        onKeyDown={handleKeyDown}
      >
        {frame ? (
          <>
            <header className="flex flex-wrap items-baseline gap-x-3 gap-y-1 pr-8">
              <DialogTitle className="text-base sm:text-lg">{title}</DialogTitle>
              <span className="text-lg font-semibold tabular-nums sm:text-xl">
                {formatMs(frame.timeMs)}
              </span>
              {frame.labels.map((label) => (
                <span
                  key={label}
                  className="rounded bg-foreground px-1.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-background"
                >
                  {label}
                </span>
              ))}
              <DialogDescription className="ml-auto text-xs tabular-nums">
                Frame {current + 1} of {frames.length} · ← → to step, space to play
              </DialogDescription>
            </header>

            <div className="relative flex min-h-0 flex-1 items-stretch gap-2">
              <Button
                variant="outline"
                size="icon"
                className="h-10 w-10 shrink-0 self-center rounded-full"
                onClick={() => go(current - 1)}
                disabled={current === 0}
              >
                <ChevronLeft className="h-5 w-5" />
                <span className="sr-only">Previous frame</span>
              </Button>

              <div
                className="grid min-h-0 min-w-0 flex-1 gap-3"
                style={{ gridTemplateColumns: `repeat(${frame.panes.length}, minmax(0, 1fr))` }}
              >
                {frame.panes.map((pane, i) => (
                  <figure key={pane.label ?? i} className="flex min-h-0 min-w-0 flex-col gap-1">
                    {multi || pane.frameTimeMs != null ? (
                      <figcaption className="flex items-baseline justify-between gap-2 text-xs">
                        <span className="truncate font-medium">{pane.label}</span>
                        {pane.frameTimeMs != null ? (
                          <span className="shrink-0 tabular-nums text-muted-foreground">
                            frame at {formatMs(pane.frameTimeMs)}
                          </span>
                        ) : null}
                      </figcaption>
                    ) : null}
                    <div className="flex min-h-0 flex-1 items-center justify-center overflow-hidden rounded-lg border bg-muted/40 p-2">
                      {pane.src ? (
                        <img
                          src={pane.src}
                          alt={`${pane.label ?? title} at ${formatMs(frame.timeMs)}`}
                          className="max-h-full max-w-full object-contain shadow-sm"
                          decoding="async"
                        />
                      ) : (
                        <p className="text-sm text-muted-foreground">Nothing painted yet</p>
                      )}
                    </div>
                  </figure>
                ))}
              </div>

              <Button
                variant="outline"
                size="icon"
                className="h-10 w-10 shrink-0 self-center rounded-full"
                onClick={() => go(current + 1)}
                disabled={current === last}
              >
                <ChevronRight className="h-5 w-5" />
                <span className="sr-only">Next frame</span>
              </Button>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                className="h-9 w-9 shrink-0"
                onClick={togglePlay}
                disabled={frames.length < 2}
              >
                {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                <span className="sr-only">{isPlaying ? "Pause" : "Play"}</span>
              </Button>
              <div className="flex min-w-0 flex-1 gap-1.5 overflow-x-auto py-1">
                {frames.map((item, i) => {
                  const src = thumbnailSrc(item);
                  const active = i === current;
                  return (
                    <button
                      key={`${item.timeMs}-${i}`}
                      ref={(node) => {
                        thumbRefs.current[i] = node;
                      }}
                      type="button"
                      aria-current={active || undefined}
                      aria-label={`Frame at ${formatMs(item.timeMs)}`}
                      onClick={() => go(i)}
                      className={cn(
                        "flex w-14 shrink-0 flex-col items-center rounded-md border-2 p-0.5 transition-colors",
                        active
                          ? "border-foreground bg-muted"
                          : "border-transparent opacity-70 hover:border-border hover:opacity-100",
                      )}
                    >
                      {src ? (
                        <img
                          src={src}
                          alt=""
                          className="h-14 w-full object-contain"
                          loading="lazy"
                          decoding="async"
                        />
                      ) : (
                        <span className="h-14 w-full rounded-sm bg-muted" />
                      )}
                      <span className="text-[10px] tabular-nums text-muted-foreground">
                        {formatMs(item.timeMs)}
                      </span>
                      <span className="min-h-3 text-[9px] font-semibold uppercase leading-3">
                        {item.labels.join("·")}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
