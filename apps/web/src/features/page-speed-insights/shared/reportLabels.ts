import { toTitleCase } from "@/features/page-speed-insights/toTitleCase";
import { PSI_RUN_LABEL_SEPARATOR } from "@/lib/viewer/psiCompareLabels";

export const ALL_DEVICES_LABEL = "All Devices";

type ReportLabelGroup = "all-devices" | "mobile" | "desktop" | "other";

function splitRunPrefix(label: string): { run: string | null; rest: string } {
  const trimmed = label.trim();
  const index = trimmed.indexOf(PSI_RUN_LABEL_SEPARATOR);
  if (index <= 0) return { run: null, rest: trimmed };
  const run = trimmed.slice(0, index).trim();
  const rest = trimmed.slice(index + PSI_RUN_LABEL_SEPARATOR.length).trim();
  if (!run || !rest) return { run: null, rest: trimmed };
  return { run, rest };
}

function getReportLabelGroup(label: string): ReportLabelGroup {
  if (label.includes(ALL_DEVICES_LABEL)) {
    return "all-devices";
  }
  if (label.includes("Mobile")) {
    return "mobile";
  }
  if (label.includes("Desktop")) {
    return "desktop";
  }
  return "other";
}

export function normalizeReportLabel(label: string): string {
  const { rest } = splitRunPrefix(label);
  const target = rest || label;
  switch (getReportLabelGroup(target)) {
    case "all-devices":
      return ALL_DEVICES_LABEL;
    case "mobile":
      return "Mobile";
    case "desktop":
      return "Desktop";
    default:
      return target.trim();
  }
}

function compareFormFactorLabels(labelA: string, labelB: string): number {
  const groupOrder: Record<ReportLabelGroup, number> = {
    "all-devices": 0,
    mobile: 1,
    desktop: 2,
    other: 3,
  };

  const normalizedLabelA = normalizeReportLabel(labelA);
  const normalizedLabelB = normalizeReportLabel(labelB);
  const groupA = getReportLabelGroup(normalizedLabelA);
  const groupB = getReportLabelGroup(normalizedLabelB);

  if (groupA !== groupB) {
    return groupOrder[groupA] - groupOrder[groupB];
  }

  return normalizedLabelA.localeCompare(normalizedLabelB);
}

/**
 * Sort report labels so the same device/form factor sits together across runs
 * (A·Mobile, B·Mobile, A·Desktop, B·Desktop). Within a form factor, keep run
 * order (first run, then second).
 */
export function compareReportLabels(labelA: string, labelB: string, runOrder: string[] = []): number {
  const a = splitRunPrefix(labelA);
  const b = splitRunPrefix(labelB);

  if (a.run || b.run) {
    if (a.run && b.run) {
      const formCmp = compareFormFactorLabels(a.rest, b.rest);
      if (formCmp !== 0) return formCmp;

      const indexA = runOrder.indexOf(a.run);
      const indexB = runOrder.indexOf(b.run);
      const orderA = indexA === -1 ? Number.MAX_SAFE_INTEGER : indexA;
      const orderB = indexB === -1 ? Number.MAX_SAFE_INTEGER : indexB;
      if (orderA !== orderB) return orderA - orderB;
      return a.run.localeCompare(b.run);
    }
    if (a.run && !b.run) return -1;
    if (!a.run && b.run) return 1;
  }

  return compareFormFactorLabels(labelA, labelB);
}

export function sortReportLabels(reportLabels: string[]): string[] {
  return [...reportLabels]
    .map(normalizeReportLabel)
    .filter(Boolean)
    .filter((label, index, labels) => labels.indexOf(label) === index)
    .sort(compareReportLabels);
}

export function formatReportLabelList(reportLabels: string[]): string {
  const sortedLabels = sortReportLabels(reportLabels);

  if (sortedLabels.length === 0) {
    return ALL_DEVICES_LABEL;
  }

  return sortedLabels.join(", ");
}

export function getCombinedReportLabel(reportLabels: string[]): string {
  if (reportLabels.length === 1) {
    return normalizeReportLabel(reportLabels[0] ?? "");
  }

  return ALL_DEVICES_LABEL;
}

export function formatReportTableTitle(
  title: string,
  reportLabel: string,
  itemCount: number,
): string {
  const auditTitle = toTitleCase(title);
  const formattedLabel = normalizeReportLabel(reportLabel);
  const itemLabel = itemCount === 1 ? "item" : "items";

  return `${auditTitle} Table for ${formattedLabel} (${itemCount} ${itemLabel})`;
}
