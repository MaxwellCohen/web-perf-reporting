"use client";
/* eslint-disable @next/next/no-img-element */

import {} from "react";
import {} from "@/features/page-speed-insights/PageSpeedContext";
import {
  type LoadingStory,
  type StoryMomentId,
  type TimingRow,
} from "@/features/page-speed-insights/dashboard-view/loading-story/loadingStoryModel";
import type {} from "@/features/page-speed-insights/page-load-timeline/types";
import { formatMs } from "@/features/page-speed-insights/shared/format";
import {} from "@/features/page-speed-insights/shared/lcpPhaseColors";
import { cn } from "@/lib/cn";
import { ratingClass } from "./LoadingStoryParts";

export function TimingTable({
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
