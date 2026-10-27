import { PSI_RUN_LABEL_SEPARATOR } from "@/lib/viewer/psiCompareLabels";
import {
  compareReportLabels,
  normalizeReportLabel,
} from "@/features/page-speed-insights/shared/reportLabels";

export type ParsedCompareLabel = {
  /** Full report label as stored on the item. */
  label: string;
  /** Run prefix when present (`A`, `Before`, …); null for single-run labels. */
  run: string | null;
  /** Form-factor / remainder after the run prefix (e.g. `Mobile`). */
  formFactor: string;
};

export type CompareRunsState<T extends { label: string } = { label: string }> =
  | { mode: "single"; runs: []; items: T[] }
  | {
      mode: "compare";
      runs: [string, string];
      items: T[];
    };

export function parseCompareLabel(label: string): ParsedCompareLabel {
  const trimmed = label.trim();
  const sep = PSI_RUN_LABEL_SEPARATOR;
  const index = trimmed.indexOf(sep);
  if (index <= 0) {
    return { label: trimmed, run: null, formFactor: trimmed };
  }
  const run = trimmed.slice(0, index).trim();
  const formFactor = trimmed.slice(index + sep.length).trim();
  if (!run || !formFactor) {
    return { label: trimmed, run: null, formFactor: trimmed };
  }
  return { label: trimmed, run, formFactor };
}

export function getCompareRuns<T extends { label: string }>(items: T[]): CompareRunsState<T> {
  const runs: string[] = [];
  for (const item of items) {
    const { run } = parseCompareLabel(item.label);
    if (!run) continue;
    if (!runs.includes(run)) runs.push(run);
  }

  if (runs.length !== 2) {
    return { mode: "single", runs: [], items };
  }

  return { mode: "compare", runs: [runs[0], runs[1]], items };
}

/** Items belonging to a run, sorted by form factor. */
export function itemsForRun<T extends { label: string }>(items: T[], run: string): T[] {
  return items
    .filter((item) => parseCompareLabel(item.label).run === run)
    .sort((a, b) =>
      compareReportLabels(
        parseCompareLabel(a.label).formFactor,
        parseCompareLabel(b.label).formFactor,
      ),
    );
}

/** Pair items that share the same form factor across the two runs. */
export function pairByFormFactor<T extends { label: string }>(
  items: T[],
  runs: [string, string],
): Array<{ formFactor: string; a?: T; b?: T }> {
  const [runA, runB] = runs;
  const byFactor = new Map<string, { formFactor: string; a?: T; b?: T }>();

  for (const item of items) {
    const parsed = parseCompareLabel(item.label);
    if (parsed.run !== runA && parsed.run !== runB) continue;
    const key = normalizeReportLabel(parsed.formFactor) || parsed.formFactor;
    const entry = byFactor.get(key) ?? { formFactor: parsed.formFactor };
    if (parsed.run === runA) entry.a = item;
    else entry.b = item;
    byFactor.set(key, entry);
  }

  return [...byFactor.values()].sort((left, right) =>
    compareReportLabels(left.formFactor, right.formFactor),
  );
}

/**
 * Given the active report label, return the label in `targetRun` with the same
 * form factor (falls back to the first label in that run).
 */
export function switchCompareRunLabel(
  currentLabel: string,
  targetRun: string,
  labels: string[],
): string | null {
  const current = parseCompareLabel(currentLabel);
  const candidates = labels.filter((label) => parseCompareLabel(label).run === targetRun);
  if (!candidates.length) return null;

  const sameFactor = candidates.find(
    (label) =>
      normalizeReportLabel(parseCompareLabel(label).formFactor) ===
      normalizeReportLabel(current.formFactor),
  );
  return sameFactor ?? candidates[0] ?? null;
}

/** Run-prefixed labels keep their added order. */
export function comparePrefixedReportLabels(
  labelA: string,
  labelB: string,
  runOrder: string[] = [],
): number {
  return compareReportLabels(labelA, labelB, runOrder);
}
