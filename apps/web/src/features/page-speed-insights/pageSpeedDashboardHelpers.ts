import { wrapLighthouseResult } from "@/lib/page-speed-insights/wrapLighthouseResult";
import type {
  FullPageScreenshot,
  NullablePageSpeedInsights,
  PageSpeedInsights,
} from "@/lib/schema";
import type { PageSpeedDashboardItem, InsightsContextItem } from "@/lib/page-speed-insights/types";
import { toTitleCase } from "@/features/page-speed-insights/toTitleCase";
import { compareReportLabels } from "@/features/page-speed-insights/shared/reportLabels";

function normalizePageSpeedItem(item: NullablePageSpeedInsights): PageSpeedInsights | null {
  if (item?.lighthouseResult) {
    return item as PageSpeedInsights;
  }

  if ((item as PageSpeedInsights["lighthouseResult"])?.lighthouseVersion) {
    return wrapLighthouseResult(item);
  }

  return null;
}

export function getDashboardItems(
  data: NullablePageSpeedInsights[] | undefined,
  labels: string[],
): PageSpeedDashboardItem[] {
  const items =
    data
      ?.map((item, index) => {
        const normalizedItem = normalizePageSpeedItem(item);

        if (!normalizedItem) {
          return null;
        }

        return {
          item: normalizedItem,
          label: labels[index] || "",
        };
      })
      .filter((item): item is PageSpeedDashboardItem => item != null) || [];

  // Same form factor across compare runs stay adjacent (Mobile|Mobile, Desktop|Desktop).
  return [...items].sort((a, b) => compareReportLabels(a.label, b.label));
}

export function getDashboardTitle(items: PageSpeedDashboardItem[]): string {
  const titleStrings = items.map(({ item }) =>
    [
      item?.lighthouseResult?.finalDisplayedUrl || "unknown url",
      item.lighthouseResult?.configSettings?.formFactor
        ? `on ${toTitleCase(item.lighthouseResult.configSettings.formFactor)}`
        : "",
      item?.analysisUTCTimestamp
        ? `at ${new Date(item.analysisUTCTimestamp).toLocaleDateString()}`
        : "",
    ]
      .join(" ")
      .trim(),
  );

  const reportTitle = titleStrings.length > 1 ? titleStrings.join(", ") : titleStrings[0];

  return `Report for ${reportTitle || "unknown url"}`;
}

export function getFullPageScreenshotMap(
  items: PageSpeedDashboardItem[],
): Record<string, FullPageScreenshot | undefined | null> {
  return items.reduce<Record<string, FullPageScreenshot | undefined | null>>(
    (screenshotsByLabel, { item, label }) => {
      screenshotsByLabel[label] = item?.lighthouseResult?.fullPageScreenshot;
      return screenshotsByLabel;
    },
    {},
  );
}

export type PageSpeedInsightsState = {
  data: NullablePageSpeedInsights[];
  labels: string[];
  allItems: InsightsContextItem[];
  items: InsightsContextItem[];
  userLabelFilter: string[] | null;
  reportTitle: string;
  fullPageScreenshots: Record<string, FullPageScreenshot | undefined | null>;
};

export function filterItemsByUserLabel<T extends { label: string }>(
  items: T[],
  userLabelFilter: string[] | null,
): T[] {
  if (!userLabelFilter || userLabelFilter.length === 0) {
    return items;
  }

  return items.filter((item) => userLabelFilter.includes(item.label));
}

export function deriveFilteredDashboardState(
  allItems: InsightsContextItem[],
  userLabelFilter: string[] | null,
) {
  const items = filterItemsByUserLabel(allItems, userLabelFilter);

  return {
    items,
    fullPageScreenshots: getFullPageScreenshotMap(items),
    reportTitle: getDashboardTitle(items),
  };
}

export function normalizeUserLabelFilter(
  labels: string[],
  selectedLabels: string[],
): string[] | null {
  if (selectedLabels.length === 0 || selectedLabels.length === labels.length) {
    return null;
  }

  return selectedLabels;
}
