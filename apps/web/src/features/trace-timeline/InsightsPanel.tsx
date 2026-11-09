"use client";

import type { ReactNode } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatBytes, formatMs } from "@/features/page-speed-insights/shared/format";
import { cn } from "@/lib/cn";
import { shortUrl } from "./analyzeLoad";
import type { Rating, TraceInsights } from "./insights";

const RATING: Record<Rating, string> = {
  good: "bg-green-500/15 text-green-700 dark:text-green-300",
  "needs-improvement": "bg-amber-500/15 text-amber-700 dark:text-amber-300",
  poor: "bg-red-500/15 text-red-700 dark:text-red-300",
};

const LCP_COLORS = ["bg-[#2f7fd6]", "bg-[#e6a700]", "bg-[#2f9e5e]", "bg-[#8e5bd6]"];
const INP_COLORS = ["bg-[#2f7fd6]", "bg-[#e6a700]", "bg-[#8e5bd6]"];

/** Trace URLs are untrusted; only link to real web resources. */
const isHttpUrl = (url: string) => /^https?:\/\//i.test(url);

function RatingPill({ rating }: { rating: Rating }) {
  return (
    <span className={cn("rounded px-1.5 py-0.5 text-[11px] font-semibold uppercase", RATING[rating])}>
      {rating.replace("-", " ")}
    </span>
  );
}

function StackedBar({
  segments,
  colors,
  label,
}: {
  segments: { label: string; ms: number }[];
  colors: string[];
  label: string;
}) {
  const total = segments.reduce((sum, s) => sum + s.ms, 0);
  return (
    <div
      role="img"
      aria-label={`${label}: ${segments.map((s) => `${s.label} ${formatMs(s.ms)}`).join(", ")}`}
      className="flex h-4 w-full overflow-hidden rounded-md border"
    >
      {total > 0 &&
        segments.map((s, i) => (
          <div
            key={s.label}
            className={colors[i % colors.length]}
            style={{ width: `${(s.ms / total) * 100}%` }}
            title={`${s.label}: ${formatMs(s.ms)}`}
          />
        ))}
    </div>
  );
}

function Section({
  title,
  value,
  rating,
  children,
}: {
  title: string;
  value?: string;
  rating?: Rating;
  children: ReactNode;
}) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex flex-wrap items-center gap-2">
          {title}
          {value && <span className="font-mono text-base tabular-nums">{value}</span>}
          {rating && <RatingPill rating={rating} />}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">{children}</CardContent>
    </Card>
  );
}

export function InsightsPanel({ insights }: { insights: TraceInsights }) {
  const { lcp, inp, cls, renderBlocking, thirdParties } = insights;
  const hasAnything = lcp || inp || cls.clusters.length || renderBlocking.length || thirdParties.length;
  if (!hasAnything) return null;

  return (
    <section className="mb-6 space-y-4" aria-label="Performance insights">
      <h2 className="text-lg font-bold">Insights</h2>

      {lcp && (
        <Section title="LCP breakdown" value={formatMs(lcp.timeMs)}>
          <StackedBar segments={lcp.subparts} colors={LCP_COLORS} label="LCP subparts" />
          <div className="grid gap-2 text-sm sm:grid-cols-2 lg:grid-cols-4">
            {lcp.subparts.map((s, i) => (
              <div key={s.key} className="rounded-md border p-2">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <i className={cn("inline-block size-2.5 rounded-sm", LCP_COLORS[i % LCP_COLORS.length])} aria-hidden />
                  {s.label}
                </div>
                <div className="mt-1 font-mono text-base tabular-nums">{formatMs(s.ms)}</div>
              </div>
            ))}
          </div>
          {lcp.element && (
            <p className="text-sm text-muted-foreground">
              LCP element: <span className="font-mono">{lcp.element}</span>
              {lcp.url && (
                <>
                  {" · "}
                  {isHttpUrl(lcp.url) ? (
                    <a className="underline" href={lcp.url} target="_blank" rel="noreferrer">
                      {shortUrl(lcp.url, 70)}
                    </a>
                  ) : (
                    <span className="font-mono">{shortUrl(lcp.url, 70)}</span>
                  )}
                </>
              )}
            </p>
          )}
        </Section>
      )}

      {inp && (
        <Section title="INP breakdown" value={formatMs(inp.valueMs)} rating={inp.rating}>
          <StackedBar
            segments={[
              { label: "Input delay", ms: inp.longest.inputDelayMs },
              { label: "Processing", ms: inp.longest.processingMs },
              { label: "Presentation delay", ms: inp.longest.presentationMs },
            ]}
            colors={INP_COLORS}
            label="INP subparts"
          />
          <div className="grid gap-2 text-sm sm:grid-cols-3">
            {[
              ["Input delay", inp.longest.inputDelayMs],
              ["Processing", inp.longest.processingMs],
              ["Presentation delay", inp.longest.presentationMs],
            ].map(([label, ms], i) => (
              <div key={label as string} className="rounded-md border p-2">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <i className={cn("inline-block size-2.5 rounded-sm", INP_COLORS[i])} aria-hidden />
                  {label}
                </div>
                <div className="mt-1 font-mono text-base tabular-nums">{formatMs(ms as number)}</div>
              </div>
            ))}
          </div>
          <p className="text-sm text-muted-foreground">
            Interaction driving INP: <span className="font-medium">{inp.longest.type}</span>
            {inp.longest.target ? ` on ${inp.longest.target}` : ""} · {inp.count} interaction
            {inp.count === 1 ? "" : "s"} in this trace
          </p>
          {inp.interactions.length > 1 && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Interaction</TableHead>
                  <TableHead className="text-right">Start</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead className="text-right">Input</TableHead>
                  <TableHead className="text-right">Processing</TableHead>
                  <TableHead className="text-right">Presentation</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {inp.interactions.map((i) => (
                  <TableRow key={i.interactionId}>
                    <TableCell className="max-w-xs truncate" title={i.target}>
                      {i.type}
                      {i.target ? ` · ${i.target}` : ""}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{formatMs(i.startMs)}</TableCell>
                    <TableCell className="text-right tabular-nums">{formatMs(i.durationMs)}</TableCell>
                    <TableCell className="text-right tabular-nums">{formatMs(i.inputDelayMs)}</TableCell>
                    <TableCell className="text-right tabular-nums">{formatMs(i.processingMs)}</TableCell>
                    <TableCell className="text-right tabular-nums">{formatMs(i.presentationMs)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </Section>
      )}

      {cls.clusters.length > 0 && (
        <Section title="CLS session windows" value={cls.score.toFixed(3)} rating={cls.rating}>
          <ul className="space-y-2 text-sm">
            {cls.clusters.map((cluster) => (
              <li key={`${cluster.startMs}-${cluster.endMs}`} className="rounded-md border p-2">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  <span className="font-mono tabular-nums">{cluster.score.toFixed(4)}</span>
                  <span className="text-muted-foreground">
                    {formatMs(cluster.startMs)} → {formatMs(cluster.endMs)}
                  </span>
                  <span className="text-muted-foreground">
                    {cluster.shifts} shift{cluster.shifts === 1 ? "" : "s"}
                  </span>
                </div>
                {cluster.nodes.length > 0 && (
                  <p className="mt-1 truncate text-muted-foreground" title={cluster.nodes.join(" · ")}>
                    {cluster.nodes.slice(0, 3).join(" · ")}
                  </p>
                )}
              </li>
            ))}
          </ul>
        </Section>
      )}

      {renderBlocking.length > 0 && (
        <Section title="Render-blocking resources" value={String(renderBlocking.length)}>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Resource</TableHead>
                <TableHead>Type</TableHead>
                <TableHead className="text-right">Duration</TableHead>
                <TableHead className="text-right">Size</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {renderBlocking.map((r, i) => (
                <TableRow key={`${r.url}-${r.startMs}-${i}`}>
                  <TableCell className="max-w-md truncate" title={r.url}>
                    {shortUrl(r.url, 80)}
                  </TableCell>
                  <TableCell className="text-muted-foreground">{r.type ?? "—"}</TableCell>
                  <TableCell className="text-right tabular-nums">{formatMs(r.durationMs)}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {r.transferBytes != null ? formatBytes(r.transferBytes) : "—"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Section>
      )}

      {thirdParties.length > 0 && (
        <Section title="Third parties" value={String(thirdParties.length)}>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Origin</TableHead>
                <TableHead className="text-right">Requests</TableHead>
                <TableHead className="text-right">Transfer</TableHead>
                <TableHead className="text-right">Main thread</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {thirdParties.map((t) => (
                <TableRow key={t.origin}>
                  <TableCell className="max-w-md truncate" title={t.origin}>
                    {t.origin}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{t.requests}</TableCell>
                  <TableCell className="text-right tabular-nums">{formatBytes(t.transferBytes)}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {t.mainThreadMs > 0 ? formatMs(t.mainThreadMs) : "—"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Section>
      )}
    </section>
  );
}
