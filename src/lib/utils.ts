import {
  CruxDate,
  CruxHistogram,
  CruxHistoryHistogramTimeseries,
  CruxHistoryItem,
  CruxHistoryReport,
  CruxReport,
  urlSchema,
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

export function formatFormFactor(string?: string) {
  if (!string) {
    return 'all';
  }
  return string
    .replaceAll('_', ' ')
    .toLowerCase()
    .split(' ')
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
    .join(' ');
}

const histogramFields = [
  'cumulative_layout_shift',
  'experimental_time_to_first_byte',
  'interaction_to_next_paint',
  'largest_contentful_paint',
  'round_trip_time',
  'first_contentful_paint',
] as const;

const percentilesTimeseries = [
  'largest_contentful_paint_image_resource_load_delay',
  'largest_contentful_paint_image_element_render_delay',
  'largest_contentful_paint_image_resource_load_duration',
  'largest_contentful_paint_image_time_to_first_byte',
] as const;

// form_factors
// largest_contentful_paint_resource_type
// navigation_types

export function formatCruxReport(
  item: CruxReport,
): CruxHistoryItem[] | null {
  const url =
    item.urlNormalizationDetails?.originalUrl ??
    item?.record?.key?.origin ??
    item.record.key.url;
  if (!url) return null;
  return histogramFields
    .map((metric) => {
      const data = item?.record?.metrics?.[metric];
      if (!data) return null;
      const d: CruxHistoryItem = JSON.parse(
        JSON.stringify({
          url,
          formFactor: item.record.key.formFactor || '',
          origin: !item.urlNormalizationDetails ? 'origin' : 'url',
          start_date: formatDate(item.record.collectionPeriod.firstDate),
          end_date: formatDate(item.record.collectionPeriod.lastDate),
          metric_name: metric,
          P75: +data.percentiles.p75,
          good_max: +(data?.histogram?.[0]?.end || 0),
          ni_max: +(data?.histogram?.[1]?.end || 0),
          good_density: +(data?.histogram?.[0]?.density || 0),
          ni_density: +(data?.histogram?.[1]?.density || 0),
          poor_density: +(data?.histogram?.[2]?.density || 0),
        }),
      );
      return d;
    })
    .filter((item): item is CruxHistoryItem => item !== null);
}

export function formatCruxHistoryReport(
  item: CruxHistoryReport,
  formFactor?: string,
): CruxHistoryItem[] | null {
  const url =
    item?.urlNormalizationDetails?.normalizedUrl ?? item?.record?.key?.origin;
  if (!url) return null;
  return histogramFields
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
          formFactor: formFactor ?? '',
          origin: !item.urlNormalizationDetails ? 'origin' : 'url',
          start_date: formatDate(time.firstDate),
          end_date: formatDate(time.lastDate),
          metric_name: metric,
          P75: +(p || 0),
          good_max: +(histogram?.[0]?.end || 0),
          ni_max: +(histogram?.[1]?.end || 0),
          good_density: +(histogram?.[0]?.densities[index] || 0),
          ni_density: +(histogram?.[1]?.densities[index] || 0),
          poor_density: +(histogram?.[2]?.densities[index] || 0),
        };
        return d;
      });
    })
    .flatMap((i) => i)
    .filter((item): item is CruxHistoryItem => !!item);
}

const makeHistogramData = (
  item: CruxHistoryHistogramTimeseries,
  index: number,
): CruxHistogram =>
  [
    {
      start: item[0].start,
      density: item[0].densities[index] || 0,
      end: item[0].end,
    },
    {
      start: item[1].start,
      density: item[1].densities[index] || 0,
      end: item[1].end,
    },
    {
      start: item[2].start,
      density: item[2].densities[index] || 0,
    },
  ] as const;

type CruxMetrics = CruxReport['record']['metrics'];

const getHistogramMetrics = (
  historicalData: CruxHistoryReport,
  index: number,
) =>
  histogramFields.reduce((acc: CruxMetrics, fieldName) => {
    const metric = historicalData.record.metrics[fieldName];
    if (!metric?.histogramTimeseries) return acc;
    const item = metric.histogramTimeseries;
    acc[fieldName] = {
      histogram: makeHistogramData(item, index),
      percentiles: {
        p75: +(metric.percentilesTimeseries.p75s?.[index] || 0),
      },
    };
    return acc;
  }, {});

const getLcpResourceTypeMetrics = (
  historicalData: CruxHistoryReport,
  index: number,
) => {
  if (!historicalData.record.metrics.largest_contentful_paint_resource_type) {
    return {};
  }
  return {
    largest_contentful_paint_resource_type: {
      fractions: {
        image: +(
          historicalData.record.metrics.largest_contentful_paint_resource_type
            .fractionTimeseries.image.fractions[index] || 0
        ),
        text: +(
          historicalData.record.metrics.largest_contentful_paint_resource_type
            .fractionTimeseries.text.fractions[index] || 0
        ),
      },
    },
  };
};

const getNavigationTypes = (
  historicalData: CruxHistoryReport,
  index: number,
) => {
  if (!historicalData?.record?.metrics?.navigation_types) {
    return {};
  }
  return {
    navigation_types: {
      fractions: Object.entries(
        historicalData.record.metrics.navigation_types.fractionTimeseries,
      ).reduce(
        (acc, [key, value]) => ({
          ...acc,
          [key]: +(value.fractions[index] || 0),
        }),
        {} as Record<
          keyof typeof historicalData.record.metrics.navigation_types.fractionTimeseries,
          number
        >,
      ),
    },
  };
};

const getPercentilesTimeseries = (
  historicalData: CruxHistoryReport,
  index: number,
) =>
  percentilesTimeseries.reduce((acc: CruxMetrics, fieldName) => {
    const metric = historicalData.record.metrics[fieldName];
    if (!metric?.percentilesTimeseries) return acc;
    acc[fieldName] = {
      percentiles: {
        p75: +(metric.percentilesTimeseries.p75s?.[index] || 0),
      },
    };
    return acc;
  }, {});


const getFormFactors = (
  historicalData: CruxHistoryReport,
  index: number,
) => {
  const fractionTimeseries = historicalData?.record?.metrics?.form_factors?.fractionTimeseries;
  if (!fractionTimeseries) {
    return {};
  }
  return {
    form_factors : {
      fractions: {
        desktop: +(fractionTimeseries.desktop.fractions[index] || 0),
        phone: +(fractionTimeseries.phone.fractions[index] || 0),
        tablet: +(fractionTimeseries.tablet.fractions[index] || 0),

      }
    }
  }
}

export function convertCruxHistoryToReports(
  historicalData: CruxHistoryReport,
): CruxReport[] {
  return historicalData.record.collectionPeriods.map((period, index) => {
    const metrics: CruxMetrics = {
      ...getHistogramMetrics(historicalData, index),
      ...getPercentilesTimeseries(historicalData, index),
      ...getLcpResourceTypeMetrics(historicalData, index),
      ...getNavigationTypes(historicalData, index),
      ...getFormFactors(historicalData, index)
    };
    return {
      record: {
        key: historicalData.record.key,
        metrics,
        collectionPeriod: period,
      },
      urlNormalizationDetails : historicalData.urlNormalizationDetails
    };
  });
}


export function groupBy<T>(list: T[], keyGetter: (item: T) => string) {
  const map = new Map<string, T[]>();
  list.forEach((item) => {
    const key = keyGetter(item);
    const collection = map.get(key);
    if (!collection) {
      map.set(key, [item]);
    } else {
      collection.push(item);
    }
  });
  return Object.fromEntries(map.entries());
}

export function updateURl(url?: string) {
  if (!url) {
    return '';
  }
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    url = 'https://' + url;
  }
  if (!url.includes('www.')) {
    const urlParts = url.split('://');
    url = urlParts[0] + '://www.' + urlParts[1];
  }
  return urlSchema.safeParse(url).data ?? '';
}