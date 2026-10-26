export const DEFAULT_PSI_RUN_LABEL_A = "A";
export const DEFAULT_PSI_RUN_LABEL_B = "B";

export const PSI_RUN_LABEL_SEPARATOR = " · ";

/** Resolve optional run names; empty → A/B. Identical names → second becomes `{name} (2)`. */
export function resolvePsiRunLabels(
  labelA?: string | null,
  labelB?: string | null,
): [string, string] {
  const a = (labelA ?? "").trim() || DEFAULT_PSI_RUN_LABEL_A;
  let b = (labelB ?? "").trim() || DEFAULT_PSI_RUN_LABEL_B;
  if (a === b) {
    b = `${b} (2)`;
  }
  return [a, b];
}

export function prefixPsiReportLabels(labels: string[], runLabel: string): string[] {
  const prefix = `${runLabel}${PSI_RUN_LABEL_SEPARATOR}`;
  return labels.map((label) => `${prefix}${label}`);
}
