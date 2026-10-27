"use client";

import { formatMs } from "@/features/page-speed-insights/shared/format";
import {
  METRIC_AUDIT_TO_ACRONYM,
  type CauseAuditEntry,
  type CwvMetricAcronym,
  type MetricAuditId,
  type MetricAuditSource,
} from "@/features/page-speed-insights/metricCauseAudits";
import {
  getCompareRuns,
  pairByFormFactor,
} from "@/features/page-speed-insights/shared/compareRuns";
import type { AuditResult } from "@/lib/schema";

/** Lighthouse lab thresholds: good ≤ good, poor > poor. */
const LAB_BANDS: Record<MetricAuditId, { good: number; poor: number; unit: "ms" | "cls" }> = {
  "first-contentful-paint": { good: 1800, poor: 3000, unit: "ms" },
  "largest-contentful-paint": { good: 2500, poor: 4000, unit: "ms" },
  "total-blocking-time": { good: 200, poor: 600, unit: "ms" },
  "cumulative-layout-shift": { good: 0.1, poor: 0.25, unit: "cls" },
  "speed-index": { good: 3400, poor: 5800, unit: "ms" },
};

const PHASE_COLOR: Record<string, string> = {
  timeToFirstByte: "hsl(var(--chart-5))",
  resourceLoadDelay: "hsl(var(--chart-6))",
  resourceLoadDuration: "hsl(var(--chart-1))",
  elementRenderDelay: "hsl(var(--chart-3))",
};

type Rating = "Good" | "Average" | "Bad";

type Phase = { id: string; label: string; duration: number };

type SavingsSlice = { title: string; savings: number };

function formatUnit(value: number, unit: "ms" | "cls"): string {
  if (unit === "cls") return value.toFixed(2);
  return formatMs(value);
}

function rate(value: number, good: number, poor: number): Rating {
  if (value <= good) return "Good";
  if (value <= poor) return "Average";
  return "Bad";
}

function ratingColor(rating: Rating): string {
  if (rating === "Good") return "hsl(var(--chart-1))";
  if (rating === "Average") return "hsl(var(--chart-2))";
  return "hsl(var(--chart-3))";
}

function headroomCopy(value: number, good: number, poor: number, unit: "ms" | "cls"): string {
  const format = (n: number) => formatUnit(n, unit);
  if (value <= good) return `${format(good - value)} - Good`;
  if (value <= poor) return `${format(value - good)} - Average`;
  return `${format(value - poor)} - Bad`;
}

function scaleMax(value: number, poor: number): number {
  return Math.max(poor * 1.5, value * 1.15, Number.EPSILON);
}

function lcpPhases(audits: MetricAuditSource["audits"] | undefined): Phase[] {
  const details = audits?.["lcp-breakdown-insight"]?.details as { items?: unknown[] } | undefined;
  if (!details?.items) return [];

  for (const entry of details.items) {
    if (!entry || typeof entry !== "object") continue;
    const table = entry as { type?: string; items?: Array<Record<string, unknown>> };
    if (table.type !== "table" || !Array.isArray(table.items)) continue;

    return table.items.flatMap((item) => {
      const id = typeof item.subpart === "string" ? item.subpart : "";
      const duration = typeof item.duration === "number" ? item.duration : 0;
      if (!id || !(duration > 0)) return [];
      const label = typeof item.label === "string" && item.label ? item.label : id;
      return [{ id, label, duration }];
    });
  }

  return [];
}

function savingsForLabel(
  causes: CauseAuditEntry[],
  acronym: CwvMetricAcronym,
  label: string,
): SavingsSlice[] {
  return causes
    .flatMap((cause) => {
      const entry = cause.entries.find((item) => item.label === label);
      const savings = entry?.audit.metricSavings?.[acronym] ?? 0;
      if (!(savings > 0)) return [];
      return [{ title: cause.title, savings }];
    })
    .sort((a, b) => b.savings - a.savings);
}

function ThresholdTrack({
  value,
  good,
  poor,
  max,
  rating,
  unit,
}: {
  value: number;
  good: number;
  poor: number;
  max: number;
  rating: Rating;
  unit: "ms" | "cls";
}) {
  const pct = (n: number) => `${Math.min(100, Math.max(0, (n / max) * 100))}%`;
  const goodPct = (good / max) * 100;
  const poorPct = (poor / max) * 100;
  const markerPct = Math.min(100, Math.max(0, (value / max) * 100));
  const goodLabel = formatUnit(good, unit);
  const poorLabel = formatUnit(poor, unit);

  return (
    <div className="space-y-1">
      <div className="relative h-3.5 overflow-hidden">
        <Tick label={goodLabel} pct={goodPct} />
        <Tick label={poorLabel} pct={poorPct} />
      </div>
      <div
        className="relative h-3 overflow-hidden rounded-sm bg-muted"
        role="img"
        aria-label={`Measured ${formatUnit(value, unit)}. Good at or under ${goodLabel}. Bad over ${poorLabel}.`}
      >
        <Band left={0} width={goodPct} color="hsl(var(--chart-1) / 0.28)" />
        <Band left={goodPct} width={poorPct - goodPct} color="hsl(var(--chart-2) / 0.28)" />
        <Band left={poorPct} width={100 - poorPct} color="hsl(var(--chart-3) / 0.28)" />
        <div
          className="absolute inset-y-0 left-0"
          style={{ width: pct(value), backgroundColor: ratingColor(rating), opacity: 0.9 }}
        />
        <div
          className="absolute inset-y-0 z-10 w-0.5 bg-foreground"
          style={{ left: `calc(${markerPct}% - 1px)` }}
        />
      </div>
    </div>
  );
}

function Tick({ label, pct }: { label: string; pct: number }) {
  const edge =
    pct < 8 ? "translateX(0)" : pct > 92 ? "translateX(-100%)" : "translateX(-50%)";
  return (
    <span
      className="absolute top-0 font-mono text-[10px] leading-none tabular-nums text-muted-foreground"
      style={{ left: `${pct}%`, transform: edge }}
    >
      {label}
    </span>
  );
}

function Band({ left, width, color }: { left: number; width: number; color: string }) {
  return (
    <div
      className="absolute inset-y-0"
      style={{ left: `${left}%`, width: `${Math.max(0, width)}%`, backgroundColor: color }}
    />
  );
}

function PhaseTrack({ phases, unit }: { phases: Phase[]; unit: "ms" | "cls" }) {
  const total = phases.reduce((sum, phase) => sum + phase.duration, 0);
  if (!(total > 0)) return null;

  const placed = phases.reduce<Array<{ phase: Phase; left: number }>>((acc, phase) => {
    const left = acc.length === 0 ? 0 : acc[acc.length - 1].left + acc[acc.length - 1].phase.duration;
    return [...acc, { phase, left }];
  }, []);

  const labels = phases.map((phase) => `${phase.label} ${formatUnit(phase.duration, unit)}`).join(", ");

  return (
    <div className="space-y-1.5" data-testid="lcp-phase-track">
      <p className="text-xs font-medium text-muted-foreground">LCP subparts</p>
      <div
        className="relative h-3 overflow-hidden rounded-sm bg-muted"
        role="img"
        aria-label={`LCP subparts: ${labels}`}
      >
        {placed.map(({ phase, left }) => (
          <div
            key={phase.id}
            className="absolute inset-y-0"
            style={{
              left: `${(left / total) * 100}%`,
              width: `${(phase.duration / total) * 100}%`,
              backgroundColor: PHASE_COLOR[phase.id] ?? "hsl(var(--chart-4))",
            }}
            title={`${phase.label}: ${formatUnit(phase.duration, unit)}`}
          />
        ))}
      </div>
      <PhaseLegend phases={phases} unit={unit} />
    </div>
  );
}

function MetricScale({
  audit,
  label,
  showLabel,
  auditId,
  phases,
  savings,
  savingsNote,
}: {
  audit: AuditResult;
  label: string;
  showLabel: boolean;
  auditId: MetricAuditId;
  phases: Phase[];
  savings: SavingsSlice[];
  /** Compact summary line. Detail view uses the savings bars instead. */
  savingsNote?: number;
}) {
  const band = LAB_BANDS[auditId];
  const value = audit.numericValue;
  if (value == null || !Number.isFinite(value)) return null;

  const rating = rate(value, band.good, band.poor);
  const max = scaleMax(value, band.poor);
  const shown = audit.displayValue ?? formatUnit(value, band.unit);

  return (
    <div className="min-w-0 space-y-1.5" data-testid={`metric-scale-${auditId}`}>
      <div className="flex items-baseline justify-between gap-2">
        <span className="flex min-w-0 items-center gap-2 text-xs font-medium">
          <span
            className="size-2 shrink-0 rounded-sm"
            style={{ backgroundColor: ratingColor(rating) }}
            aria-hidden
          />
          <span className="truncate">{showLabel ? label : rating}</span>
          {showLabel ? <span className="truncate text-muted-foreground">{rating}</span> : null}
        </span>
        <span className="shrink-0 font-mono text-sm font-medium tabular-nums">{shown}</span>
      </div>
      <ThresholdTrack
        value={value}
        good={band.good}
        poor={band.poor}
        max={max}
        rating={rating}
        unit={band.unit}
      />
      <p className="text-xs leading-snug text-muted-foreground">
        {headroomCopy(value, band.good, band.poor, band.unit)}
      </p>
      {savingsNote != null && savingsNote > 0 ? (
        <p className="text-xs leading-snug text-muted-foreground">
          Up to {formatUnit(savingsNote, band.unit)} in estimated savings
        </p>
      ) : null}
      {phases.length > 0 ? <PhaseTrack phases={phases} unit={band.unit} /> : null}
      {savings.length > 0 ? (
        <SavingsBars savings={savings} value={value} unit={band.unit} />
      ) : null}
    </div>
  );
}

function PhaseLegend({ phases, unit }: { phases: Phase[]; unit: "ms" | "cls" }) {
  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-1">
      {phases.map((phase) => (
        <li key={phase.id} className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <span
            className="size-2 shrink-0 rounded-sm"
            style={{ backgroundColor: PHASE_COLOR[phase.id] ?? "hsl(var(--chart-4))" }}
            aria-hidden
          />
          <span>{phase.label}</span>
          <span className="font-mono tabular-nums">{formatUnit(phase.duration, unit)}</span>
        </li>
      ))}
    </ul>
  );
}

function SavingsBars({
  savings,
  value,
  unit,
}: {
  savings: SavingsSlice[];
  value: number;
  unit: "ms" | "cls";
}) {
  const basis = Math.max(value, ...savings.map((slice) => slice.savings), Number.EPSILON);

  return (
    <div className="space-y-1.5 pt-1">
      <p className="text-xs font-medium text-muted-foreground">Estimated savings</p>
      <ul className="space-y-1.5">
        {savings.map((slice) => (
          <li key={slice.title} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2">
            <span className="truncate text-xs">{slice.title}</span>
            <span className="font-mono text-xs tabular-nums text-muted-foreground">
              {formatUnit(slice.savings, unit)}
            </span>
            <span className="col-span-2 h-1.5 overflow-hidden rounded-sm bg-muted">
              <span
                className="block h-full bg-foreground/70"
                style={{ width: `${Math.min(100, (slice.savings / basis) * 100)}%` }}
              />
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function formatMetricDelta(
  from: number,
  to: number,
  unit: "ms" | "cls",
  runFrom: string,
  runTo: string,
): string {
  const delta = to - from;
  if (unit === "cls") {
    const signed = delta > 0 ? `+${delta.toFixed(2)}` : delta.toFixed(2);
    return `Δ ${signed} (${runFrom} → ${runTo})`;
  }
  const rounded = Math.round(delta);
  const signed = rounded > 0 ? `+${rounded} ms` : `${rounded} ms`;
  return `Δ ${signed} (${runFrom} → ${runTo})`;
}

function CompareMetricDeltas({
  auditId,
  rows,
  runs,
}: {
  auditId: MetricAuditId;
  rows: Array<{ audit: AuditResult; label: string }>;
  runs: [string, string];
}) {
  const band = LAB_BANDS[auditId];
  const pairs = pairByFormFactor(rows, runs);
  const deltas = pairs.flatMap((pair) => {
    const from = pair.a?.audit.numericValue;
    const to = pair.b?.audit.numericValue;
    if (from == null || to == null || !Number.isFinite(from) || !Number.isFinite(to)) {
      return [];
    }
    return [
      {
        key: pair.formFactor,
        formFactor: pair.formFactor,
        text: formatMetricDelta(from, to, band.unit, runs[0], runs[1]),
      },
    ];
  });

  if (!deltas.length) return null;

  return (
    <ul className="space-y-0.5" data-testid="metric-compare-delta">
      {deltas.map((delta) => (
        <li key={delta.key} className="text-xs tabular-nums text-muted-foreground">
          {pairs.length > 1 ? `${delta.formFactor}: ` : null}
          {delta.text}
        </li>
      ))}
    </ul>
  );
}

export function MetricValueViz({
  auditId,
  auditItems,
  causes = [],
  sources = [],
  detail = true,
}: {
  auditId: MetricAuditId;
  auditItems: Array<{ audit: AuditResult; label: string }>;
  causes?: CauseAuditEntry[];
  sources?: MetricAuditSource[];
  /** Detail sections include phase bars and per-audit savings. Summary cards stay compact. */
  detail?: boolean;
}) {
  const acronym: CwvMetricAcronym = METRIC_AUDIT_TO_ACRONYM[auditId];

  const rows = auditItems.filter(
    (item) => item.audit.numericValue != null && Number.isFinite(item.audit.numericValue),
  );
  if (!rows.length) return null;

  const compare = getCompareRuns(rows);
  const layoutClass =
    detail && rows.length > 1 ? "grid grid-cols-2 gap-3" : "flex flex-col gap-3";

  return (
    <div className="space-y-2" data-testid="metric-value-viz">
      <div className={layoutClass}>
        {rows.map(({ audit, label }) => {
          const source = sources.find((item) => item.label === label);
          const savings = savingsForLabel(causes, acronym, label);
          const savingsNote = detail
            ? undefined
            : Math.max(0, ...savings.map((slice) => slice.savings));
          return (
            <MetricScale
              key={label}
              audit={audit}
              label={label}
              showLabel={rows.length > 1}
              auditId={auditId}
              phases={
                detail && auditId === "largest-contentful-paint"
                  ? lcpPhases(source?.audits)
                  : []
              }
              savings={detail ? savings : []}
              savingsNote={savingsNote}
            />
          );
        })}
      </div>
      {compare.mode === "compare" ? (
        <CompareMetricDeltas auditId={auditId} rows={rows} runs={compare.runs} />
      ) : null}
    </div>
  );
}
