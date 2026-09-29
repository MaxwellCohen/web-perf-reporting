"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { CauseAuditEntry, MetricAuditSource } from "@/features/page-speed-insights/metricCauseAudits";
import {
  formatTaskMs,
  longTaskItemsFromAudit,
  LONG_TASK_THRESHOLD_MS,
  summarizeLongTaskScripts,
  summarizeMainThreadTasks,
  taskItemsFromAudit,
  type MainThreadTaskSummary,
  type ScriptBlockingRow,
} from "@/features/page-speed-insights/mainThreadTaskSummary";
import { ResourceUrlCell } from "@/features/page-speed-insights/shared/ResourceUrlCell";

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border bg-muted/30 px-3 py-2">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="font-mono text-sm font-medium tabular-nums">{value}</dd>
    </div>
  );
}

function TaskSummaryStats({ summary }: { summary: MainThreadTaskSummary }) {
  return (
    <dl className="grid grid-cols-2 gap-2 sm:grid-cols-5">
      <Stat label="Tasks" value={String(summary.totalTasks)} />
      <Stat label="Total time" value={formatTaskMs(summary.totalTimeMs)} />
      <Stat label="Longest" value={formatTaskMs(summary.longestDurationMs)} />
      <Stat label="Long tasks" value={String(summary.longTaskCount)} />
      <Stat label="Blocking time" value={formatTaskMs(summary.blockingTimeMs)} />
    </dl>
  );
}

function isHttpUrl(url: string): boolean {
  return url.startsWith("http://") || url.startsWith("https://");
}

function ScriptLabel({ url }: { url: string }) {
  if (isHttpUrl(url)) {
    return <ResourceUrlCell url={url} />;
  }
  return <span className="text-sm text-muted-foreground">{url}</span>;
}

function ScriptBlockingTable({ rows }: { rows: ScriptBlockingRow[] }) {
  if (rows.length === 0) return null;

  return (
    <div className="space-y-2">
      <h5 className="text-sm font-medium">Scripts</h5>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Script</TableHead>
            <TableHead>Tasks</TableHead>
            <TableHead>Blocking</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={row.url}>
              <TableCell className="max-w-112">
                <ScriptLabel url={row.url} />
              </TableCell>
              <TableCell className="font-mono tabular-nums">{row.taskCount}</TableCell>
              <TableCell className="font-mono tabular-nums">{formatTaskMs(row.blockingTimeMs)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function LongTaskTable({ summary }: { summary: MainThreadTaskSummary }) {
  if (summary.longTaskCount === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No tasks longer than {LONG_TASK_THRESHOLD_MS} ms, so this trace adds no Total Blocking
        Time from main-thread tasks.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Start</TableHead>
            <TableHead>Duration</TableHead>
            <TableHead>Blocking</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {summary.longestTasks.map((task, index) => (
            <TableRow key={`${index}-${task.startTime}-${task.duration}`}>
              <TableCell className="font-mono tabular-nums">{formatTaskMs(task.startTime)}</TableCell>
              <TableCell className="font-mono tabular-nums">{formatTaskMs(task.duration)}</TableCell>
              <TableCell className="font-mono tabular-nums">
                {formatTaskMs(task.blockingTime)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      {summary.omittedLongTaskCount > 0 ? (
        <p className="text-xs text-muted-foreground">
          {summary.omittedLongTaskCount} more long{" "}
          {summary.omittedLongTaskCount === 1 ? "task" : "tasks"} not shown. Blocking time above
          includes them.
        </p>
      ) : null}
    </div>
  );
}

export function MainThreadTasksCause({
  entries,
  sources = [],
}: {
  entries: CauseAuditEntry["entries"];
  sources?: MetricAuditSource[];
}) {
  const reports = entries.map(({ audit, label }) => {
    const longTasksAudit = sources.find((source) => source.label === label)?.audits["long-tasks"];
    return {
      label,
      summary: summarizeMainThreadTasks(taskItemsFromAudit(audit)),
      scripts: summarizeLongTaskScripts(longTaskItemsFromAudit(longTasksAudit)),
    };
  });
  const showLabels = reports.length > 1;

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Blocking time is how long each task runs past {LONG_TASK_THRESHOLD_MS} ms. That excess is
        what can add to Total Blocking Time, which Lighthouse only counts between first paint and
        interactive, so this total can be higher than the TBT score. Lighthouse ties its longest
        tasks to the script that was running. That is the script URL, not the original source file.
      </p>
      {reports.map(({ label, summary, scripts }) => (
        <section key={label} className="space-y-3">
          {showLabels ? (
            <h5 className="text-sm font-semibold text-muted-foreground">{label}</h5>
          ) : null}
          <TaskSummaryStats summary={summary} />
          <ScriptBlockingTable rows={scripts} />
          <LongTaskTable summary={summary} />
        </section>
      ))}
    </div>
  );
}
