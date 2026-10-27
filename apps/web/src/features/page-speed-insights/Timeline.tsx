"use client";
/* eslint-disable @next/next/no-img-element */
import { AuditDetailFilmstrip } from "@/lib/schema";
import { useMemo, useState } from "react";
import {
  labelsByFrameIndex,
  type FilmstripMarker,
} from "@/features/page-speed-insights/shared/filmstripMarkers";
import {
  FilmstripViewer,
  type FilmstripViewerFrame,
} from "@/features/page-speed-insights/shared/FilmstripViewer";

interface TimelineProps {
  timeline?: AuditDetailFilmstrip;
  device?: string;
  markers?: FilmstripMarker[];
}

function FrameLabels({ labels }: { labels: string[] }) {
  if (!labels.length) return null;
  return (
    <div className="mt-0.5 text-center text-[10px] font-medium uppercase tracking-wide text-foreground">
      {labels.join(" · ")}
    </div>
  );
}

export function Timeline({ timeline, device, markers = [] }: TimelineProps) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const frameLabels = useMemo(
    () => labelsByFrameIndex(timeline?.items ?? [], markers),
    [timeline?.items, markers],
  );
  const viewerFrames = useMemo<FilmstripViewerFrame[]>(
    () =>
      (timeline?.items ?? []).map((item, i) => ({
        timeMs: item.timing,
        labels: frameLabels[i] ?? [],
        panes: [{ label: device, src: item.data }],
      })),
    [timeline?.items, frameLabels, device],
  );

  if (!timeline?.items?.length) return null;

  return (
    <div className="px-4">
      <h3 className="text-lg font-bold">{device ? `${device} - ` : ""} Timeline</h3>
      <div className="mt-3 flex flex-row gap-2 align-top overflow-x-auto pb-2">
        {timeline.items.map((item, i) => (
          <div className="shrink-0" key={`${i}-${item.timestamp}`}>
            <button
              type="button"
              aria-haspopup="dialog"
              aria-label={`Open full-screen view at ${item.timing} ms`}
              className="cursor-zoom-in rounded-md border-2 p-2 transition-transform hover:scale-105 hover:border-foreground/40"
              onClick={() => setOpenIndex(i)}
            >
              <img
                alt={`timeline image at ${item.timing}`}
                width={80}
                loading="lazy"
                decoding="async"
                src={item.data}
              />
              <div>{item.timing} ms</div>
              <FrameLabels labels={frameLabels[i] ?? []} />
            </button>
          </div>
        ))}
      </div>
      <FilmstripViewer
        title={device ? `${device} timeline` : "Timeline"}
        frames={viewerFrames}
        index={openIndex}
        onIndexChange={setOpenIndex}
        onClose={() => setOpenIndex(null)}
      />
    </div>
  );
}
