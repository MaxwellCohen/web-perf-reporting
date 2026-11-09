import { encode } from "@toon-format/toon";
import type {
  EventsReport,
  FindReport,
  InsightsReport,
  InteractionsReport,
  NavigationsReport,
  NetworkReport,
  OverviewReport,
  ScanReport,
  ShiftsReport,
  TasksReport,
  TraceReport,
} from "./trace.js";

export type OutputFormat = "md" | "json" | "toon";

const round = (value: number, decimals = 2) => {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
};
const formatMs = (value: number, decimals = 2) => `${round(Number.isFinite(value) ? value : 0, decimals)}ms`;
const formatBytes = (bytes: number): string => {
  // Chrome uses -1 for unknown sizes; never render a negative transfer size.
  const safe = Number.isFinite(bytes) ? Math.max(0, bytes) : 0;
  if (!safe) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const index = Math.min(units.length - 1, Math.floor(Math.log(safe) / Math.log(1024)));
  return `${round(safe / 1024 ** index, 2)} ${units[index]}`;
};
const longestBacktickRun = (text: string) =>
  Math.max(0, ...Array.from(text.matchAll(/`+/g), (m) => m[0].length));
/** Trace strings are untrusted: keep a table cell on one line and escape pipes. */
const oneLine = (value: string) => value.replace(/\r\n|\r|\n/g, " ").replace(/\|/g, "\\|");
/** Plain cells have no code delimiters, so a backtick would open an unclosed span. */
const cell = (value: string) => oneLine(value).replace(/`/g, "'");
/** A code span must use more backticks than any run inside it, or it closes early. */
const code = (value: string) => {
  const text = oneLine(value);
  const longest = longestBacktickRun(text);
  if (!longest) return `\`${text}\``;
  const marker = "`".repeat(longest + 1);
  const pad = text.startsWith("`") || text.endsWith("`") ? " " : "";
  return `${marker}${pad}${text}${pad}${marker}`;
};
/** Pick a fence longer than any backtick run in the body, so JSON cannot break out. */
const fence = (language: string, body: string) => {
  const marker = "`".repeat(Math.max(3, longestBacktickRun(body) + 1));
  return [`${marker}${language}`, body, marker];
};
const table = (headers: string[], rows: string[][]) =>
  [`| ${headers.join(" | ")} |`, `|${headers.map(() => "---").join("|")}|`, ...rows.map((row) => `| ${row.join(" | ")} |`)].join("\n");

function overviewMd(report: OverviewReport): string {
  const { fcp, lcp, cls, inp } = report.coreWebVitals;
  const lines: string[] = ["# Trace Overview", ""];
  lines.push(`- **Main URL**: ${report.url ? code(report.url) : "N/A"}`);
  lines.push(
    `- **Duration**: ${code(formatMs(report.bounds.durationMs))} (${code(formatMs(report.bounds.minMs))} – ${code(formatMs(report.bounds.maxMs))})`,
  );
  if (report.navigationStartMs !== null) lines.push(`- **Navigation Start**: ${code(formatMs(report.navigationStartMs))}`);
  lines.push("", "## Core Web Vitals", "");
  lines.push(
    table(
      ["Metric", "Value", "Rating", "Details"],
      [
        ["FCP", fcp ? formatMs(fcp.valueMs) : "N/A", fcp?.rating ?? "N/A", "-"],
        ["LCP", lcp ? formatMs(lcp.valueMs) : "N/A", lcp?.rating ?? "N/A", cell(lcp?.element ?? lcp?.url ?? "-")],
        [
          "CLS",
          cls ? String(cls.value) : "N/A",
          cls?.rating ?? "N/A",
          cls?.worstCluster !== undefined ? `Worst cluster: ${cls.worstCluster}` : "-",
        ],
        ["INP", inp ? formatMs(inp.valueMs) : "N/A", inp?.rating ?? "N/A", cell(inp?.interactionType ?? "-")],
      ],
    ),
  );

  const b = report.mainThreadBreakdown;
  const total = b.totalMs > 0 ? b.totalMs : 1;
  const share = (value: number) => `${((value / total) * 100).toFixed(1)}%`;
  lines.push("", "## Main Thread Time Breakdown", "");
  lines.push(
    table(
      ["Category", "Duration", "Share"],
      [
        ["Scripting", formatMs(b.scriptingMs), share(b.scriptingMs)],
        ["Layout", formatMs(b.layoutMs), share(b.layoutMs)],
        ["Rendering", formatMs(b.renderingMs), share(b.renderingMs)],
        ["Garbage Collection", formatMs(b.gcMs), share(b.gcMs)],
        ["System", formatMs(b.systemMs), share(b.systemMs)],
        ["Idle", formatMs(b.idleMs), share(b.idleMs)],
        ["**Total**", `**${formatMs(b.totalMs)}**`, "**100%**"],
      ],
    ),
  );

  if (report.warnings.length) {
    lines.push("", "## Warnings & Diagnostics", "");
    for (const warning of report.warnings) lines.push(`- ${cell(warning)}`);
  }
  return lines.join("\n");
}

function insightsMd(report: InsightsReport): string {
  const lines: string[] = ["# Diagnostic Insights", ""];
  if (report.navigationId) lines.push(`- **Navigation ID**: ${code(report.navigationId)}`, "");
  const headerLines = lines.length;
  if (report.lcpBreakdown) {
    const l = report.lcpBreakdown;
    lines.push("## LCP Breakdown", "");
    lines.push(`- **Total LCP**: ${code(formatMs(l.totalLcpMs))}`);
    lines.push(`- **TTFB**: ${code(formatMs(l.ttfbMs))}`);
    lines.push(`- **Resource Load Delay**: ${code(formatMs(l.loadDelayMs))}`);
    lines.push(`- **Resource Load Duration**: ${code(formatMs(l.loadDurationMs))}`);
    lines.push(`- **Element Render Delay**: ${code(formatMs(l.renderDelayMs))}`);
    if (l.element) lines.push(`- **Element**: ${code(l.element)}`);
    if (l.url) lines.push(`- **Resource URL**: ${code(l.url)}`);
    lines.push("");
  }
  if (report.inpBreakdown) {
    const i = report.inpBreakdown;
    lines.push("## INP Breakdown", "");
    lines.push(`- **Event Type**: ${code(i.eventType)}`);
    lines.push(`- **Total Duration**: ${code(formatMs(i.totalDurationMs))}`);
    lines.push(`- **Input Delay**: ${code(formatMs(i.inputDelayMs))}`);
    lines.push(`- **Processing Duration**: ${code(formatMs(i.processingDurationMs))}`);
    lines.push(`- **Presentation Delay**: ${code(formatMs(i.presentationDelayMs))}`);
    if (i.target) lines.push(`- **Target**: ${code(i.target)}`);
    lines.push("");
  }
  if (report.clsCulprits?.length) {
    lines.push("## CLS Culprits", "");
    lines.push(
      table(
        ["Timestamp", "Score", "Culprit Elements"],
        report.clsCulprits.map((c) => [formatMs(c.timestampMs), String(c.score), cell(c.culpritNodes.join(", ") || "N/A")]),
      ),
    );
    lines.push("");
  }
  if (report.renderBlocking?.length) {
    lines.push("## Render Blocking Resources", "");
    lines.push(
      table(
        ["URL", "Duration", "Transfer Size"],
        report.renderBlocking.map((r) => [code(r.url), formatMs(r.durationMs), formatBytes(r.transferSizeBytes)]),
      ),
    );
    lines.push("");
  }
  if (report.thirdParties?.length) {
    lines.push("## Third-Party Entities", "");
    lines.push(
      table(
        ["Entity", "Main Thread CPU", "Transfer Size"],
        report.thirdParties.map((t) => [cell(t.entityName), formatMs(t.mainThreadTimeMs), formatBytes(t.transferSizeBytes)]),
      ),
    );
    lines.push("");
  }
  if (report.warnings?.length) {
    lines.push("## Warnings", "");
    for (const warning of report.warnings) lines.push(`- ${cell(warning)}`);
  }
  if (lines.length <= headerLines) lines.push("No insights found in this trace.");
  return lines.join("\n").trimEnd();
}

function tasksMd(report: TasksReport): string {
  const lines = [`# Tasks (${report.mode})`, ""];
  if (!report.tasks.length) return `${lines.join("\n")}No tasks found matching criteria.`;
  lines.push(
    table(
      ["Start", "Duration", "Self Time", "Function / Task", "Location"],
      report.tasks.map((t) => [
        formatMs(t.startTimeMs),
        formatMs(t.durationMs),
        formatMs(t.selfTimeMs),
        code(t.functionName),
        code(t.url ? `${t.url}${t.lineNumber !== undefined ? `:${t.lineNumber + 1}` : ""}` : "-"),
      ]),
    ),
  );
  return lines.join("\n");
}

function findMd(report: FindReport): string {
  const lines = ["# Function Search", ""];
  lines.push(`- **Query**: ${code(report.functionQuery)}`);
  lines.push(`- **Calls**: ${report.totalCalls}`);
  if (report.totalCalls) {
    lines.push(`- **Total Duration**: ${code(formatMs(report.totalDurationMs))}`);
    lines.push(`- **Average Duration**: ${code(formatMs(report.avgDurationMs))}`);
    lines.push(`- **First / Last**: ${formatMs(report.firstCallMs ?? 0)} / ${formatMs(report.lastCallMs ?? 0)}`);
  }
  lines.push("");
  if (!report.calls.length) return `${lines.join("\n")}No matching calls.`;
  lines.push(
    table(
      ["Timestamp", "Duration", "Location"],
      report.calls.map((c) => [
        formatMs(c.timestampMs),
        formatMs(c.durationMs),
        code(c.url ? `${c.url}${c.lineNumber !== undefined ? `:${c.lineNumber + 1}` : ""}` : "-"),
      ]),
    ),
  );
  return lines.join("\n");
}

function networkMd(report: NetworkReport): string {
  const lines = ["# Network Requests", ""];
  if (report.initiatorChain?.length) {
    lines.push("## Initiator Chain", "");
    for (const [index, item] of report.initiatorChain.entries()) {
      lines.push(`${"  ".repeat(index)}- ${code(item.url)}${item.initiatorUrl ? ` ← ${code(item.initiatorUrl)}` : ""}`);
    }
    lines.push("");
  }
  if (!report.requests.length) return `${lines.join("\n")}No network requests found matching criteria.`;
  lines.push(
    table(
      ["URL", "MIME", "Priority", "Queue", "TTFB", "Download", "Total", "Size", "Blocking"],
      report.requests.map((r) => [
        code(r.url),
        cell(r.mimeType || "-"),
        cell(r.priority),
        formatMs(r.queueingMs),
        formatMs(r.ttfbMs),
        formatMs(r.downloadMs),
        formatMs(r.totalDurationMs),
        formatBytes(r.transferSizeBytes),
        r.renderBlocking ? "yes" : "no",
      ]),
    ),
  );
  return lines.join("\n");
}

function interactionsMd(report: InteractionsReport): string {
  const lines = ["# User Interactions", ""];
  if (!report.interactions.length) return `${lines.join("\n")}No interactions found in this trace.`;
  lines.push(
    table(
      ["Type", "Target", "Start", "Total", "Input Delay", "Processing", "Presentation"],
      report.interactions.map((i) => [
        cell(i.eventType),
        cell(i.targetElement ?? "-"),
        formatMs(i.startTimeMs),
        formatMs(i.durationMs),
        formatMs(i.inputDelayMs),
        formatMs(i.processingDurationMs),
        formatMs(i.presentationDelayMs),
      ]),
    ),
  );
  return lines.join("\n");
}

function shiftsMd(report: ShiftsReport): string {
  const lines = ["# Layout Shifts", ""];
  if (!report.clusters.length) return `${lines.join("\n")}No layout shift clusters found.`;
  lines.push(
    table(
      ["Timestamp", "Duration", "Score", "Culprits"],
      report.clusters.map((c) => [
        formatMs(c.timestampMs),
        formatMs(c.durationMs),
        String(c.cumulativeScore),
        cell(c.culprits.map((n) => n.selector ?? n.debugName ?? n.tagName ?? `Node #${n.nodeId}`).join(", ") || "N/A"),
      ]),
    ),
  );
  if (report.note) lines.push("", `> Note: ${report.note}`);
  const withEvents = report.clusters.filter((c) => c.events?.length);
  if (withEvents.length) {
    lines.push("", "## Individual Shifts", "");
    for (const cluster of withEvents) {
      lines.push(`### ${formatMs(cluster.timestampMs)} (score ${cluster.cumulativeScore})`, "");
      lines.push(
        table(
          ["Timestamp", "Score", "Recent Input"],
          (cluster.events ?? []).map((e) => [formatMs(e.timestampMs), String(e.score), e.hadRecentInput ? "yes" : "no"]),
        ),
      );
      lines.push("");
    }
  }
  return lines.join("\n").trimEnd();
}

function eventsMd(report: EventsReport): string {
  const lines = ["# Trace Events", ""];
  lines.push(`- **Matched**: ${report.totalMatched} (returned ${report.returned})`, "");
  if (!report.events.length) return `${lines.join("\n")}No events matched.`;
  lines.push(
    table(
      ["Name", "Timestamp", "Duration", "Category", "Phase", "PID", "TID"],
      report.events.map((e) => [
        code(e.name),
        formatMs(e.tsMs),
        e.durMs !== undefined ? formatMs(e.durMs) : "-",
        cell(e.cat ?? "-"),
        cell(e.ph ?? "-"),
        cell(String(e.pid ?? "-")),
        cell(String(e.tid ?? "-")),
      ]),
    ),
  );
  if (report.events.some((e) => e.selectedFields)) {
    lines.push("", "## Selected Fields", "");
    const body = JSON.stringify(
      report.events.map((e) => ({ name: e.name, tsMs: e.tsMs, ...e.selectedFields })),
      null,
      2,
    );
    lines.push(...fence("json", body));
  }
  return lines.join("\n");
}

function navigationsMd(report: NavigationsReport): string {
  const lines = ["# Navigations", ""];
  lines.push(`- **Total**: ${report.total}`);
  lines.push(`- **Insight Sets**: ${report.insightSetIds.length ? report.insightSetIds.map(code).join(", ") : "none"}`, "");
  if (!report.navigations.length) return `${lines.join("\n")}No navigations found.`;
  lines.push(
    table(
      ["Navigation ID", "URL", "Start", "Main Frame", "Insight Set"],
      report.navigations.map((n) => [
        code(n.navigationId),
        code(n.url || "-"),
        formatMs(n.timestampMs),
        n.isMainFrame ? "yes" : "no",
        n.insightSetId ? code(n.insightSetId) : "-",
      ]),
    ),
  );
  return lines.join("\n");
}

function scanMd(report: ScanReport): string {
  const lines = ["# Trace Scan", ""];
  lines.push(`- **Files scanned**: ${report.totalFilesScanned}`);
  lines.push(`- **Files matched**: ${report.totalFilesMatched}`);
  if (report.totalFilesSkipped) lines.push(`- **Files skipped**: ${report.totalFilesSkipped}`);
  lines.push(`- **Events matched**: ${report.totalEventsMatched}`, "");
  if (report.skippedFiles.length) {
    lines.push(
      "## Skipped Files",
      "",
      table(
        ["File", "Reason"],
        report.skippedFiles.map((f) => [code(f.file), cell(f.reason)]),
      ),
      "",
    );
  }
  if (!report.matchedFiles.length) return `${lines.join("\n")}No matching files.`;
  lines.push(
    table(
      ["File", "Matches", "Categories", "First Event"],
      report.matchedFiles.map((f) => [
        code(f.file),
        String(f.matchCount),
        cell(f.categories.join(", ") || "-"),
        cell(f.firstEventName ? `${f.firstEventName} @ ${formatMs(f.firstEventTsMs ?? 0)}` : "-"),
      ]),
    ),
  );
  return lines.join("\n");
}

const NEXT_STEPS = [
  "---",
  "### Drill-down Commands",
  "- `web-perf-report trace insights <file> [--category <lcp|inp|cls|render-blocking|third-parties>]`",
  "- `web-perf-report trace tasks <file> [--min-duration <ms>] [--tree <bottom-up|top-down>] [--top <n>]`",
  "- `web-perf-report trace find <file> --function <name> [--time-range <start,end>]`",
  "- `web-perf-report trace network <file> [--render-blocking] [--slowest <n>]`",
  "- `web-perf-report trace interactions <file>`",
  "- `web-perf-report trace shifts <file> [--events]`",
  "- `web-perf-report trace events <file> [--name <names>] [--cat <category>] [--fields <fields>]`",
  "- `web-perf-report trace navigations <file>`",
  "- `web-perf-report trace scan <dir-or-glob> --grep <pattern>`",
].join("\n");

function markdown(report: TraceReport): string {
  switch (report.command) {
    case "overview":
      return overviewMd(report);
    case "insights":
      return insightsMd(report);
    case "tasks":
      return tasksMd(report);
    case "find":
      return findMd(report);
    case "network":
      return networkMd(report);
    case "interactions":
      return interactionsMd(report);
    case "shifts":
      return shiftsMd(report);
    case "events":
      return eventsMd(report);
    case "navigations":
      return navigationsMd(report);
    case "scan":
      return scanMd(report);
  }
}

export function formatTraceReport(
  report: TraceReport,
  format: OutputFormat,
  options: { includeHint?: boolean } = {},
): string {
  if (format === "json") return JSON.stringify(report, null, 2);
  if (format === "toon") return encode(report);
  const output = markdown(report);
  return options.includeHint ? `${output}\n\n${NEXT_STEPS}` : output;
}
