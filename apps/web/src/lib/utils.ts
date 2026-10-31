import { CruxDate, CruxHistoryItem, CruxReport } from "@/lib/schema";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const formatDate = (data?: CruxDate) => {
  if (!data) {
    return "";
  }
  const date = new Date(data.year, data.month - 1, data.day);
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "numeric",
    day: "numeric",
  });
};

const histogramFields = [
  "cumulative_layout_shift",
  "experimental_time_to_first_byte",
  "interaction_to_next_paint",
  "largest_contentful_paint",
  "round_trip_time",
  "first_contentful_paint",
  "experimental_largest_contentful_paint_with_softnavs",
  "experimental_interaction_to_next_paint_with_softnavs",
  "experimental_cumulative_layout_shift_with_softnavs",
] as const;

// form_factors
// largest_contentful_paint_resource_type
// navigation_types

export function formatCruxReport(item: CruxReport | null): CruxHistoryItem[] | null {
  const url =
    item?.urlNormalizationDetails?.originalUrl ??
    item?.record?.key?.origin ??
    item?.record?.key?.url;
  if (!url) return null;
  return histogramFields
    .map((metric) => {
      const data = item?.record?.metrics?.[metric];
      if (!data) return null;
      const d: CruxHistoryItem = JSON.parse(
        JSON.stringify({
          url,
          formFactor: item.record.key.formFactor || "",
          origin: !item.urlNormalizationDetails ? "origin" : "url",
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

export function getUrlString(url: unknown): string {
  return typeof url === "string" ? url : "";
}

export function getNumber(value: unknown): number | undefined {
  return typeof value === "number" ? value : undefined;
}

export function updateURl(url?: string) {
  if (!url) {
    return "";
  }

  let normalized = url.trim();
  if (!normalized.startsWith("http://") && !normalized.startsWith("https://")) {
    normalized = `https://${normalized}`;
  }

  try {
    // Throws on invalid input (e.g. spaces in the host); keep the user's original form otherwise.
    new URL(normalized);
    return normalized;
  } catch {
    return "";
  }
}

/** Next.js `searchParams` prop; normalize the `url` query value for CrUX report pages. */
export async function normalizedCruxUrlFromSearchParams(
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>,
): Promise<string> {
  const params = await searchParams;
  return updateURl(params.url as string);
}
