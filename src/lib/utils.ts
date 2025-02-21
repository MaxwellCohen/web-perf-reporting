import {
  CruxDate,
  CruxHistoryItem,
  CruxHistoryReport,
  CruxReport,
} from '@/lib/schema';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const formatDate = (data?: CruxDate) => {
  if (!data) {
    return '';
  }
  const date = new Date(data.year, data.month - 1, data.day);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
  });
};

export function formatFormFactor(string: string) {
  return string
    .replaceAll('_', ' ')
    .toLowerCase()
    .split(' ')
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
    .join(' ');
}

const metrics = [
  'cumulative_layout_shift',
  'experimental_time_to_first_byte',
  'interaction_to_next_paint',
  'largest_contentful_paint',
  'round_trip_time',
  'first_contentful_paint',
] as const;

export function formatCruxReport(item: CruxReport): CruxHistoryItem[] | null {
  const url =
    item.urlNormalizationDetails?.normalizedUrl ?? item?.record?.key?.origin;
  console.log('hi', url);
  if (!url) return null;
  return metrics
    .map((metric) => {
      const data = item?.record?.metrics[metric];
      if (!data) return null;
      const d: CruxHistoryItem = {
        url:
          item.urlNormalizationDetails?.normalizedUrl ??
          item.record.key.origin ??
          '',
        origin: !item.urlNormalizationDetails,
        start_date: formatDate(item.record.collectionPeriod.firstDate),
        end_date: formatDate(item.record.collectionPeriod.lastDate),
        metric_name: metric,
        P75: +data.percentiles.p75,
        good_max: +(data?.histogram?.[0]?.end || 0) || undefined,
        ni_max: +(data?.histogram?.[1]?.end || 0) || undefined,
        good_density: +(data?.histogram?.[0]?.density || 0) || undefined,
        ni_density: +(data?.histogram?.[1]?.density || 0) || undefined,
        poor_density: +(data?.histogram?.[2]?.density || 0) || undefined,
      };
      return d;
    })
    .filter((item): item is CruxHistoryItem => item !== null);
}

export function formatCruxHistoryReport(
  item: CruxHistoryReport,
): CruxHistoryItem[] | null {
  const url =
    item?.urlNormalizationDetails?.normalizedUrl ?? item?.record?.key?.origin;
  if (!url) return null;
  return metrics
    .map((metric) => {
      const data = item?.record?.metrics[metric];
      if (!data) return null;

      return data.percentilesTimeseries.p75s?.map((p, index) => {
        const histogram = data.histogramTimeseries;
        const time = item.record.collectionPeriods[index];
        if (!histogram || !time) {
          return null;
        }
        const d: CruxHistoryItem = {
          url,
          origin: !item.urlNormalizationDetails,
          start_date: formatDate(time.firstDate),
          end_date: formatDate(time.lastDate),
          metric_name: metric,
          P75: +(p || 0) || undefined,
          good_max: +(histogram?.[0]?.end || 0) || undefined,
          ni_max: +(histogram?.[1]?.end || 0) || undefined,
          good_density: +(histogram?.[0]?.densities[index] || 0) || undefined,
          ni_density: +(histogram?.[1]?.densities[index] || 0) || undefined,
          poor_density: +(histogram?.[2]?.densities[index] || 0) || undefined,
        };
        return d;
      });
    })
    .flatMap((i) => i)
    .filter((item): item is CruxHistoryItem => !!item);
}
