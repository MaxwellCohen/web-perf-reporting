"use client";

import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CopyButton } from "@/components/ui/copy-button";
import { patchDashboardSearch } from "@/features/page-speed-insights/dashboard-view/dashboardSearch";
import { buildFixPrompt } from "@/features/page-speed-insights/dashboard-view/investigate/fixPrompt";
import {
  buildTriage,
  triagePage,
  triagePrompt,
  type Hypothesis,
  type TriageTab,
  type Verdict,
} from "@/features/page-speed-insights/dashboard-view/investigate/triageModel";
import {
  formatScore,
  summarizeReport,
} from "@/features/page-speed-insights/dashboard-view/reportScoreSummary";
import type { InsightsContextItem } from "@/lib/page-speed-insights/types";
import { cn } from "@/lib/utils";

const VERDICT_LABEL: Record<Verdict, string> = {
  confirmed: "Confirmed",
  contributes: "Contributes",
  "ruled-out": "Ruled out",
};

const VERDICT_BADGE: Record<Verdict, "destructive" | "secondary" | "outline"> = {
  confirmed: "destructive",
  contributes: "secondary",
  "ruled-out": "outline",
};

const TAB_LABEL: Record<TriageTab, string> = {
  timeline: "Timeline",
  resources: "Resources",
  weight: "Page Weight",
  audits: "Audits",
};

type Filter = "all" | Verdict;
const FILTERS: Filter[] = ["all", "confirmed", "contributes", "ruled-out"];

function HypothesisRow({
  hypothesis: h,
  item,
  otherVerdict,
}: {
  hypothesis: Hypothesis;
  item: InsightsContextItem["item"];
  otherVerdict?: string;
}) {
  const [open, setOpen] = useState(false);
  const { url, formFactor } = triagePage(item);
  const measured = h.sourceAudits.length > 0;
  const prompt = buildFixPrompt({
    url,
    formFactor,
    metric: h.metrics.join(", "),
    title: h.question,
    evidence: h.evidence,
    fix: h.fix,
    auditId: h.auditId,
  });
  return (
    <li className="rounded-lg border bg-card p-3">
      <div className="flex flex-wrap items-start gap-3">
        <Badge variant={VERDICT_BADGE[h.verdict]} className="shrink-0">
          {VERDICT_LABEL[h.verdict]}
        </Badge>
        <div className="min-w-0 flex-1 space-y-1">
          <h3 className="text-sm font-medium">{h.question}</h3>
          <p className="text-sm text-muted-foreground">{h.summary}</p>
          <div className="flex flex-wrap items-center gap-1.5">
            {h.metrics.map((metric) => (
              <Badge key={metric} variant="outline" className="font-mono text-[11px]">
                {metric}
              </Badge>
            ))}
            {otherVerdict ? (
              <span className="text-xs text-muted-foreground">{otherVerdict}</span>
            ) : null}
          </div>
        </div>
        <span className="font-mono text-sm tabular-nums">{h.costDisplay}</span>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          aria-expanded={open}
          aria-label={`${open ? "Hide" : "Show"} details: ${h.question}`}
          onClick={() => setOpen((v) => !v)}
        >
          {open ? "Hide" : "Details"}
        </Button>
      </div>
      {open ? (
        <div className="mt-3 grid gap-4 border-t pt-3 md:grid-cols-2">
          <div className="space-y-2">
            <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
              Evidence
            </p>
            {h.evidence.length ? (
              <table className="w-full text-xs">
                <tbody>
                  {h.evidence.map(({ k, v }) => (
                    <tr key={`${k}:${v}`} className="border-b last:border-b-0 align-top">
                      <th
                        scope="row"
                        className="py-1 pr-3 text-left font-normal text-muted-foreground"
                      >
                        {k}
                      </th>
                      <td className="min-w-0 break-all py-1 font-mono">{v}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p className="text-xs text-muted-foreground">No evidence recorded.</p>
            )}
            <p className="text-xs text-muted-foreground">Source: {h.sourceLabel}</p>
          </div>
          <div className="space-y-2">
            <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
              What to do
            </p>
            <p className="rounded-md bg-muted p-2 text-xs">{h.fix}</p>
            {measured ? (
              <div className="flex flex-wrap gap-2">
                <CopyButton text={prompt} size="sm">
                  <span className="ml-2">Copy fix prompt</span>
                </CopyButton>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    patchDashboardSearch(
                      { tab: h.tab, ...(h.tab === "audits" ? { audit: h.auditId } : {}) },
                      "push",
                    )
                  }
                >
                  Open in {TAB_LABEL[h.tab]} tab
                </Button>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </li>
  );
}

export function TriageView({
  primary,
  secondary,
}: {
  primary: InsightsContextItem;
  secondary?: InsightsContextItem;
}) {
  const [filter, setFilter] = useState<Filter>("all");
  const hypotheses = useMemo(() => buildTriage(primary.item), [primary]);
  const otherById = useMemo(
    () => (secondary ? new Map(buildTriage(secondary.item).map((h) => [h.id, h.verdict])) : null),
    [secondary],
  );
  const { url, formFactor } = triagePage(primary.item);
  const score = summarizeReport(primary).performance?.score ?? null;
  const confirmed = hypotheses.filter((h) => h.verdict === "confirmed");
  const count = (f: Filter) =>
    f === "all" ? hypotheses.length : hypotheses.filter((h) => h.verdict === f).length;
  const shown = filter === "all" ? hypotheses : hypotheses.filter((h) => h.verdict === filter);

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <h2 className="text-lg font-semibold">
          We checked {hypotheses.length} common causes. {confirmed.length} are confirmed.
        </h2>
        <p className="break-all text-sm text-muted-foreground">
          {url} · {formFactor} · score {formatScore(score)}
        </p>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div role="group" aria-label="Filter by verdict" className="flex flex-wrap gap-2">
          {FILTERS.map((f) => (
            <Button
              key={f}
              type="button"
              size="sm"
              variant="outline"
              aria-pressed={filter === f}
              className={cn(filter === f && "border-foreground bg-accent")}
              onClick={() => setFilter(f)}
            >
              {f === "all" ? "All" : VERDICT_LABEL[f]} ({count(f)})
            </Button>
          ))}
        </div>
        <CopyButton
          text={triagePrompt(primary.item, hypotheses)}
          size="sm"
          disabled={!confirmed.length}
        >
          <span className="ml-2">Copy prompt for confirmed causes</span>
        </CopyButton>
      </div>
      <ul className="space-y-2">
        {shown.map((h) => {
          const other = otherById?.get(h.id);
          return (
            <HypothesisRow
              key={h.id}
              hypothesis={h}
              item={primary.item}
              otherVerdict={
                other && secondary ? `${secondary.label}: ${VERDICT_LABEL[other]}` : undefined
              }
            />
          );
        })}
      </ul>
    </div>
  );
}
