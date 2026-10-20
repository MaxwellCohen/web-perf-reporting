import { formatMs, formatNetworkPriority } from "@/features/page-speed-insights/shared/format";
import {
  chainLabel,
  scriptCpuLabel,
} from "@/features/page-speed-insights/shared/scriptResourceFacts";
import { rowsToMarkdown } from "@/features/page-speed-insights/tanstack-table-v9/rowsToMarkdown";
import { momentInterval } from "./clusterOverlappingMoments";
import type {
  MarkerKind,
  PageLoadTimeline,
  TimelineEvent,
  TimelineNote,
  TimelineTable,
  TimelineWaterfallBar,
} from "./types";

const KIND_LABEL: Partial<Record<MarkerKind, string>> = {
  blocking: "blocking",
  "potentially-blocking": "potentially blocking",
  cwv: "cwv",
};

function formatRange(startMs: number, endMs: number): string {
  if (startMs === endMs) return formatMs(startMs);
  return `${formatMs(startMs)}–${formatMs(endMs)}`;
}

function eventTiming(event: TimelineEvent): string {
  const { startMs, endMs } = momentInterval(event);
  return formatRange(startMs, endMs);
}

function eventTitleLine(event: TimelineEvent): string {
  const parts = [event.title, eventTiming(event)];
  if (event.rating) parts.push(event.rating.replace(/-/g, " "));
  const kind = KIND_LABEL[event.kind];
  if (kind) parts.push(kind);
  return `### ${parts.join(" · ")}`;
}

function waterfallLine(bar: TimelineWaterfallBar): string {
  const parts = [
    `\`${bar.href ?? bar.label}\``,
    bar.resourceType,
    formatRange(bar.startMs, bar.endMs),
    bar.renderBlocking?.replace(/-/g, " "),
    bar.priority ? `priority ${formatNetworkPriority(bar.priority)}` : undefined,
    bar.coverage ? `coverage ${bar.coverage}` : undefined,
    bar.scriptSize,
    bar.downloadDuration ? `download ${bar.downloadDuration}` : undefined,
    scriptCpuLabel(bar.scriptCpu) ?? undefined,
    chainLabel(bar.chain) ?? undefined,
  ].filter((part): part is string => Boolean(part));
  return `  - ${parts.join(" · ")}`;
}

function noteLine(note: TimelineNote): string {
  const head = [note.title];
  if (note.timeMs != null) {
    const end = note.endMs != null && note.endMs !== note.timeMs ? note.endMs : note.timeMs;
    head.push(formatRange(note.timeMs, end));
  }
  if (note.rating) head.push(note.rating.replace(/-/g, " "));
  const prefix = head.join(" · ");
  return note.detail ? `  - ${prefix} — ${note.detail}` : `  - ${prefix}`;
}

function tableMarkdown(table: TimelineTable): string {
  const rows = [
    table.headers.map((cell) => cell.text),
    ...table.rows.map((row) => row.map((cell) => cell.text)),
  ];
  return rowsToMarkdown(rows);
}

function eventBlocks(event: TimelineEvent): string[] {
  const head = [eventTitleLine(event)];
  if (event.detail) head.push(event.detail);
  const blocks: string[] = [head.join("\n")];

  if (event.evidence.length > 0) {
    blocks.push(`- Evidence: ${event.evidence.join("; ")}`);
  }

  if (event.waterfall?.length) {
    const summary =
      event.id.startsWith("long-task-") || event.id.startsWith("short-task-")
        ? "Tasks"
        : "Requests";
    blocks.push(["- " + summary + ":", ...event.waterfall.map(waterfallLine)].join("\n"));
  }

  if (event.notes?.length) {
    blocks.push(["- Notes:", ...event.notes.map(noteLine)].join("\n"));
  }

  if (event.table) {
    blocks.push(tableMarkdown(event.table));
  }

  if (event.lcpSegments?.length) {
    const lines = event.lcpSegments.map(
      (seg) =>
        `  - ${seg.label} · ${formatMs(seg.durationMs)} (${formatRange(seg.startMs, seg.endMs)})`,
    );
    blocks.push(["- LCP breakdown:", ...lines].join("\n"));
  }

  return blocks;
}

export function timelineToMarkdown(timeline: PageLoadTimeline): string {
  const label = timeline.label?.trim() || "Report";
  const header = [`# Page load timeline — ${label}`];
  if (timeline.simulationLabel) {
    header.push(`Times include simulated ${timeline.simulationLabel}`);
  }

  if (timeline.events.length === 0) {
    return [...header, "", "No timeline events."].join("\n");
  }

  header.push(`Axis end: ${formatMs(timeline.axisEndMs)}`);

  const sections: string[] = [header.join("\n")];

  for (const event of timeline.events) {
    if (event.isPhaseStart) {
      const { startMs } = momentInterval(event);
      sections.push(`## ${event.phaseTitle} · ${formatMs(startMs)}`);
    }
    sections.push(eventBlocks(event).join("\n\n"));
  }

  return sections.join("\n\n");
}
