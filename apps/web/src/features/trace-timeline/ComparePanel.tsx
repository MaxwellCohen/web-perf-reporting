"use client";

import { useMemo } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { shortUrl } from "./analyzeLoad";
import { diffFindings, type Delta } from "./diffFindings";
import type { TraceSnapshot } from "./findings";

const fmt = (v: number | undefined, d: Delta) =>
  v == null
    ? "n/a"
    : v.toLocaleString(undefined, { maximumFractionDigits: d.digits }) +
      (d.unit === "ms" ? " ms" : "");

function Rows({ rows, short }: { rows: Delta[]; short?: boolean }) {
  return rows.map((d) => {
    const v = d.delta;
    const sign = v == null || v === 0 ? "" : v > 0 ? "+" : "";
    return (
      <TableRow key={d.label}>
        <TableCell className="max-w-md truncate" title={d.label}>
          {short ? shortUrl(d.label, 80) : d.label}
        </TableCell>
        <TableCell className="text-right tabular-nums">{fmt(d.before, d)}</TableCell>
        <TableCell className="text-right tabular-nums">{fmt(d.after, d)}</TableCell>
        <TableCell
          className={cn(
            "text-right font-medium tabular-nums",
            v == null || v === 0
              ? "text-muted-foreground"
              : v < 0
                ? "text-emerald-600 dark:text-emerald-400"
                : "text-red-600 dark:text-red-400",
          )}
        >
          {v == null
            ? "n/a"
            : `${sign}${v.toLocaleString(undefined, { maximumFractionDigits: d.digits })}${d.unit === "ms" ? " ms" : ""}`}
        </TableCell>
      </TableRow>
    );
  });
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="mb-1 text-sm font-semibold">{title}</h3>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead />
            <TableHead className="text-right">Before</TableHead>
            <TableHead className="text-right">After</TableHead>
            <TableHead className="text-right">Change</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>{children}</TableBody>
      </Table>
    </div>
  );
}

export function ComparePanel({
  before,
  after,
  onClose,
}: {
  before: TraceSnapshot;
  after: TraceSnapshot;
  onClose?: () => void;
}) {
  const diff = useMemo(() => diffFindings(before, after), [before, after]);
  return (
    <section className="mb-6 space-y-4" aria-label="Before and after comparison">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h2 className="text-lg font-bold">Before / after</h2>
          <p className="text-xs text-muted-foreground">
            Before = the trace above; after = the compared trace. Green is better, red is worse.
          </p>
        </div>
        {onClose && (
          <button className="rounded border px-2 py-0.5 text-xs" onClick={onClose}>
            Clear comparison
          </button>
        )}
      </div>
      <Section title="Metrics">
        <Rows rows={diff.metrics} />
      </Section>
      <Section title="Main thread by category">
        <Rows rows={diff.categories} />
      </Section>
      {diff.scripts.length > 0 && (
        <Section title="Top script changes">
          <Rows rows={diff.scripts} short />
        </Section>
      )}
    </section>
  );
}
