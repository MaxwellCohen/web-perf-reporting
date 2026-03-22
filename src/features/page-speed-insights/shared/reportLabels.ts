import { toTitleCase } from '@/features/page-speed-insights/toTitleCase';

export const ALL_DEVICES_LABEL = 'All Devices';

type ReportLabelGroup = 'all-devices' | 'mobile' | 'desktop' | 'other';

function getReportLabelGroup(label: string): ReportLabelGroup {
  if (label.includes(ALL_DEVICES_LABEL)) {
    return 'all-devices';
  }
  if (label.includes('Mobile')) {
    return 'mobile';
  }
  if (label.includes('Desktop')) {
    return 'desktop';
  }
  return 'other';
}

export function normalizeReportLabel(label: string): string {
  switch (getReportLabelGroup(label)) {
    case 'all-devices':
      return ALL_DEVICES_LABEL;
    case 'mobile':
      return 'Mobile';
    case 'desktop':
      return 'Desktop';
    default:
      return label.trim();
  }
}

export function compareReportLabels(labelA: string, labelB: string): number {
  const groupOrder: Record<ReportLabelGroup, number> = {
    'all-devices': 0,
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

  return sortedLabels.join(', ');
}

export function getCombinedReportLabel(reportLabels: string[]): string {
  if (reportLabels.length === 1) {
    return normalizeReportLabel(reportLabels[0] ?? '');
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
  const itemLabel = itemCount === 1 ? 'item' : 'items';

  return `${auditTitle} Table for ${formattedLabel} (${itemCount} ${itemLabel})`;
}
