import {
  getCompareRuns,
  pairByFormFactor,
} from "@/features/page-speed-insights/shared/compareRuns";

/** Reports a tab can show side by side (`report=` in the URL). */
export const COMPARE_SELECTION_MAX = 2;

/** URL labels that still exist; else the first A/B pair when two runs are loaded; else the first report. */
export function resolveCompareSelection(urlReports: string[], labels: string[]): string[] {
  const known = urlReports.filter((label) => labels.includes(label));
  if (known.length) return known.slice(0, COMPARE_SELECTION_MAX);

  const labeled = labels.map((label) => ({ label }));
  const compare = getCompareRuns(labeled);
  if (compare.mode === "compare") {
    const pair = pairByFormFactor(labeled, compare.runs)[0];
    const paired = [pair?.a?.label, pair?.b?.label].filter((label): label is string => !!label);
    if (paired.length) return paired;
  }
  return labels.slice(0, 1);
}

/** Add or remove a label. Never empties the selection; a third pick drops the oldest. */
export function toggleCompareSelection(selected: string[], label: string): string[] {
  if (selected.includes(label)) {
    return selected.length <= 1 ? selected : selected.filter((value) => value !== label);
  }
  if (selected.length < COMPARE_SELECTION_MAX) return [...selected, label];
  return [...selected.slice(1), label];
}

/** Chip order: with two runs, A then B per form factor (Mobile pair, then Desktop pair). */
export function orderCompareLabels(labels: string[]): string[] {
  const labeled = labels.map((label) => ({ label }));
  const compare = getCompareRuns(labeled);
  if (compare.mode !== "compare") return labels;

  const paired = pairByFormFactor(labeled, compare.runs).flatMap((pair) =>
    [pair.a?.label, pair.b?.label].filter((label): label is string => !!label),
  );
  return [...paired, ...labels.filter((label) => !paired.includes(label))];
}
