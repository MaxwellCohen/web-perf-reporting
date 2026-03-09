import type {
  FullPageScreenshot,
  NullablePageSpeedInsights,
  PageSpeedInsights,
} from '@/lib/schema';
import type { PageSpeedDashboardItem } from '@/components/page-speed/pageSpeedInsightsTypes';
import { toTitleCase } from '@/components/page-speed/toTitleCase';

function normalizePageSpeedItem(
  item: NullablePageSpeedInsights,
): PageSpeedInsights | null {
  if (item?.lighthouseResult) {
    return item as PageSpeedInsights;
  }

  if ((item as PageSpeedInsights['lighthouseResult'])?.lighthouseVersion) {
    return { lighthouseResult: item } as unknown as PageSpeedInsights;
  }

  return null;
}

export function getDashboardItems(
  data: NullablePageSpeedInsights[] | undefined,
  labels: string[],
): PageSpeedDashboardItem[] {
  return (
    data
      ?.map((item, index) => {
        const normalizedItem = normalizePageSpeedItem(item);

        if (!normalizedItem) {
          return null;
        }

        return {
          item: normalizedItem,
          label: labels[index] || '',
        };
      })
      .filter((item): item is PageSpeedDashboardItem => item != null) || []
  );
}

export function getDashboardTitle(items: PageSpeedDashboardItem[]): string {
  const titleStrings = items.map(({ item }) =>
    [
      item?.lighthouseResult?.finalDisplayedUrl || 'unknown url',
      item.lighthouseResult?.configSettings?.formFactor
        ? `on ${toTitleCase(item.lighthouseResult.configSettings.formFactor)}`
        : '',
      item?.analysisUTCTimestamp
        ? `at ${new Date(item.analysisUTCTimestamp).toLocaleDateString()}`
        : '',
    ]
      .join(' ')
      .trim(),
  );

  const reportTitle =
    titleStrings.length > 1 ? titleStrings.join(', ') : titleStrings[0];

  return `Report for ${reportTitle || 'unknown url'}`;
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
