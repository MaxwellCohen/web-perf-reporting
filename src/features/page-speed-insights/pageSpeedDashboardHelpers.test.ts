import { describe, expect, it } from 'vitest';
import type { NullablePageSpeedInsights } from '@/lib/schema';
import type { PageSpeedDashboardItem } from '@/lib/page-speed-insights/types';
import {
  getDashboardItems,
  getDashboardTitle,
  getFullPageScreenshotMap,
} from '@/features/page-speed-insights/pageSpeedDashboardHelpers';

function createLighthouseResult(overrides: Record<string, unknown> = {}) {
  return {
    lighthouseVersion: '12.8.2',
    finalDisplayedUrl: 'https://example.com',
    configSettings: {
      formFactor: 'mobile',
    },
    fullPageScreenshot: {
      nodes: {},
      screenshot: {
        data: 'image-data',
        height: 200,
        width: 100,
      },
    },
    ...overrides,
  };
}

function asNullablePageSpeedInsights(
  value: unknown,
): NullablePageSpeedInsights {
  return value as NullablePageSpeedInsights;
}

function asDashboardItem(value: unknown): PageSpeedDashboardItem {
  return value as PageSpeedDashboardItem;
}

describe('pageSpeedDashboardHelpers', () => {
  it('normalizes mixed PageSpeed item shapes and drops invalid entries', () => {
    const lighthouseResult = createLighthouseResult();

    const items = getDashboardItems(
      [
        asNullablePageSpeedInsights({
          lighthouseResult,
          analysisUTCTimestamp: '2024-02-03T12:00:00.000Z',
        }),
        asNullablePageSpeedInsights({
          ...createLighthouseResult({
            finalDisplayedUrl: 'https://wrapped-example.com',
            configSettings: { formFactor: 'desktop' },
          }),
          analysisUTCTimestamp: '2024-02-04T12:00:00.000Z',
        }),
        asNullablePageSpeedInsights({
          foo: 'bar',
        }),
      ],
      ['Mobile run', 'Desktop run', 'Ignored'],
    );

    expect(items).toHaveLength(2);
    expect(items[0]?.label).toBe('Mobile run');
    expect(items[0]?.item.lighthouseResult.finalDisplayedUrl).toBe(
      'https://example.com',
    );
    expect(items[1]?.label).toBe('Desktop run');
    expect(items[1]?.item.lighthouseResult.configSettings?.formFactor).toBe(
      'desktop',
    );
  });

  it('returns an empty list for missing data and an empty label fallback', () => {
    expect(getDashboardItems(undefined, ['Unused label'])).toEqual([]);

    expect(
      getDashboardItems(
        [
          asNullablePageSpeedInsights({
            lighthouseResult: createLighthouseResult(),
          }),
        ],
        [],
      ),
    ).toEqual([
      {
        item: {
          lighthouseResult: createLighthouseResult(),
        },
        label: '',
      },
    ]);
  });

  it('builds a readable dashboard title from all reports', () => {
    const items = getDashboardItems(
      [
        asNullablePageSpeedInsights({
          lighthouseResult: createLighthouseResult(),
          analysisUTCTimestamp: '2024-02-03T12:00:00.000Z',
        }),
        asNullablePageSpeedInsights({
          lighthouseResult: createLighthouseResult({
            finalDisplayedUrl: 'https://example.org',
            configSettings: { formFactor: 'desktop' },
          }),
          analysisUTCTimestamp: '2024-02-04T12:00:00.000Z',
        }),
      ],
      ['Mobile run', 'Desktop run'],
    );

    expect(getDashboardTitle(items)).toBe(
      `Report for https://example.com on Mobile at ${new Date(
        '2024-02-03T12:00:00.000Z',
      ).toLocaleDateString()}, https://example.org on Desktop at ${new Date(
        '2024-02-04T12:00:00.000Z',
      ).toLocaleDateString()}`,
    );
  });

  it('falls back to unknown values when title fields are missing', () => {
    expect(
      getDashboardTitle([
        asDashboardItem({
          item: {
            lighthouseResult: createLighthouseResult({
              finalDisplayedUrl: '',
              configSettings: {},
            }),
          },
          label: 'Only report',
        }),
      ]),
    ).toBe('Report for unknown url');

    expect(getDashboardTitle([])).toBe('Report for unknown url');
  });

  it('indexes screenshots by report label', () => {
    const items = getDashboardItems(
      [
        asNullablePageSpeedInsights({
          lighthouseResult: createLighthouseResult(),
        }),
        asNullablePageSpeedInsights({
          lighthouseResult: createLighthouseResult({
            fullPageScreenshot: null,
          }),
        }),
      ],
      ['First report', 'Second report'],
    );

    expect(getFullPageScreenshotMap(items)).toEqual({
      'First report': {
        nodes: {},
        screenshot: {
          data: 'image-data',
          height: 200,
          width: 100,
        },
      },
      'Second report': null,
    });
  });

  it('returns an empty screenshot map when there are no items', () => {
    expect(getFullPageScreenshotMap([])).toEqual({});
  });
});
