"use client";

import { useEffect, useMemo, useState } from "react";
import { Link2 } from "lucide-react";
import { CopyButton } from "@/components/ui/copy-button";
import { formatMs } from "@/features/page-speed-insights/shared/format";
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
import {
  FINDING_CATEGORIES,
  type FindingCategory,
  type Severity,
  type TraceSnapshot,
} from "./findings";
import { buildFindingsPrompt } from "./findingsPrompt";
import { buildShareUrl } from "./shareFindings";

const SEV: Record<Severity, string> = {
  high: "bg-red-500/15 text-red-700 dark:text-red-300",
  medium: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
  low: "bg-sky-500/15 text-sky-700 dark:text-sky-300",
};
const CAT_COLOR: Record<FindingCategory, string> = {
  script: "bg-[#e6a700]",
  layout: "bg-[#8e5bd6]",
  paint: "bg-[#2f9e5e]",
  gc: "bg-[#e8743b]",
  other: "bg-[#8a94a3]",
};

export function CategoryBar({ categoryMs }: { categoryMs: TraceSnapshot["categoryMs"] }) {
  const total = FINDING_CATEGORIES.reduce((a, c) => a + categoryMs[c], 0);
  const label = FINDING_CATEGORIES.map((c) => `${c} ${formatMs(categoryMs[c])}`).join(", ");
  return (
    <div>
      <div
        role="img"
        aria-label={`Main-thread time by category: ${label}`}
        className="flex h-4 w-full overflow-hidden rounded-md border"
      >
        {total > 0 &&
          FINDING_CATEGORIES.map((c) => (
            <div
              key={c}
              className={CAT_COLOR[c]}
              style={{ width: `${(categoryMs[c] / total) * 100}%` }}
              title={`${c}: ${formatMs(categoryMs[c])}`}
            />
          ))}
      </div>
      <ul className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
        {FINDING_CATEGORIES.map((c) => (
          <li key={c} className="flex items-center gap-1">
            <i className={cn("inline-block size-2.5 rounded-sm", CAT_COLOR[c])} aria-hidden />
            {c} <span className="tabular-nums">{formatMs(categoryMs[c])}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function FindingsPanel({
  snapshot,
  shared = false,
}: {
  snapshot: TraceSnapshot;
  shared?: boolean;
}) {
  const prompt = useMemo(() => buildFindingsPrompt(snapshot), [snapshot]);
  const [shareUrl, setShareUrl] = useState("");
  useEffect(() => {
    if (shared) return;
    let live = true;
    buildShareUrl(window.location.origin, snapshot).then(
      (u) => live && setShareUrl(u),
      () => {},
    );
    return () => {
      live = false;
    };
  }, [snapshot, shared]);

  return (
    <section className="mb-6 space-y-4" aria-label="Findings">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-bold">Findings</h2>
        <div className="flex gap-2">
          <CopyButton text={prompt} size="sm" aria-label="Copy findings as AI prompt">
            Copy as AI prompt
          </CopyButton>
          {!shared && (
            <CopyButton text={shareUrl} size="sm" disabled={!shareUrl} aria-label="Copy share link">
              <Link2 className="size-4" aria-hidden />
              Share link
            </CopyButton>
          )}
        </div>
      </div>

      {snapshot.findings.length ? (
        <ol className="space-y-2">
          {snapshot.findings.map((f) => (
            <li key={f.title} className="rounded-md border p-3">
              <div className="flex items-center gap-2">
                <span
                  className={cn(
                    "rounded px-1.5 py-0.5 text-[11px] font-semibold uppercase",
                    SEV[f.severity],
                  )}
                >
                  {f.severity}
                </span>
                <span className="font-medium">{f.title}</span>
              </div>
              {f.detail && <p className="mt-1 text-sm text-muted-foreground">{f.detail}</p>}
            </li>
          ))}
        </ol>
      ) : (
        <p className="text-sm text-muted-foreground">No findings above thresholds.</p>
      )}

      <div>
        <h3 className="mb-1 text-sm font-semibold">Main thread by category</h3>
        <CategoryBar categoryMs={snapshot.categoryMs} />
      </div>

      {snapshot.topScripts.length > 0 && (
        <div>
          <h3 className="mb-1 text-sm font-semibold">Top scripts</h3>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Script</TableHead>
                <TableHead className="text-right">Time</TableHead>
                <TableHead className="text-right">Calls</TableHead>
                <TableHead className="text-right">Blocking</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {snapshot.topScripts.map((s) => (
                <TableRow key={s.url}>
                  <TableCell className="max-w-md truncate" title={s.url}>
                    {shortUrl(s.url, 80)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{formatMs(s.ms)}</TableCell>
                  <TableCell className="text-right tabular-nums">{s.count}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {s.blockingMs ? formatMs(s.blockingMs) : "—"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {snapshot.layoutShifts.length > 0 && (
        <div>
          <h3 className="mb-1 text-sm font-semibold">Layout shifts (no recent input)</h3>
          <ul className="space-y-1 text-sm">
            {snapshot.layoutShifts.map((s, i) => (
              <li key={i} className="flex gap-3">
                <span className="w-20 tabular-nums text-muted-foreground">
                  {formatMs(s.timeMs)}
                </span>
                <span className="w-16 font-medium tabular-nums">{s.score.toFixed(4)}</span>
                <span className="truncate text-muted-foreground">{s.nodes.join(" · ") || "—"}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
