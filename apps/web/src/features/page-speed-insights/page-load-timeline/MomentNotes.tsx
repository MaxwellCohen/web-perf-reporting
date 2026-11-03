"use client";

import { formatMs } from "@/features/page-speed-insights/shared/format";
import { cn } from "@/lib/cn";
import { ratingClass } from "./timelineStyles";
import type { TimelineNote } from "./types";

function noteTimeLabel(note: TimelineNote): string | null {
  if (note.timeMs == null) return null;
  if (note.endMs != null && note.endMs !== note.timeMs) {
    return `${formatMs(note.timeMs)}–${formatMs(note.endMs)}`;
  }
  return formatMs(note.timeMs);
}

export function MomentNotes({ notes }: { notes: TimelineNote[] }) {
  return (
    <div className="space-y-3 border-t border-border/70 pt-3">
      {notes.map((note) => {
        const statusLabel =
          note.status === "measured" && note.timeMs == null ? null : note.status.replace("-", " ");
        const timeLabel = noteTimeLabel(note);
        return (
          <div key={note.id} className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-sm font-semibold leading-snug">{note.title}</p>
              {note.rating ? (
                <span
                  className={cn(
                    "rounded px-1.5 py-0.5 text-[10px] font-medium uppercase",
                    ratingClass(note.rating),
                  )}
                >
                  {note.rating.replace("-", " ")}
                </span>
              ) : null}
              {statusLabel ? (
                <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
                  {statusLabel}
                </span>
              ) : null}
              {timeLabel ? (
                <span className="ml-auto text-[11px] tabular-nums text-muted-foreground">
                  {timeLabel}
                </span>
              ) : null}
            </div>
            <p className="text-sm text-muted-foreground">{note.detail}</p>
          </div>
        );
      })}
    </div>
  );
}
