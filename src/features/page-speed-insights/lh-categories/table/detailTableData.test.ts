import { describe, expect, it } from 'vitest';
import {
  flattenDetailItems,
  flattenDetailRows,
  getAuditId,
  groupRowsByReportLabel,
  hasDetailItems,
  hasDetailSubitems,
} from '@/features/page-speed-insights/lh-categories/table/detailTableData';
import type { DetailTableItem } from '@/features/page-speed-insights/lh-categories/table/detailTableShared';

function createRow(
  label: string,
  items: Array<Record<string, unknown>>,
  auditId = 'largest-contentful-paint',
): DetailTableItem {
  return {
    _userLabel: label,
    auditResult: {
      id: auditId,
      details: {
        items,
      },
    },
  } as any;
}

describe('detailTableData', () => {
  it('returns empty-state values when no rows are provided', () => {
    expect(getAuditId([])).toBeUndefined();
    expect(hasDetailItems([])).toBe(false);
    expect(hasDetailSubitems([])).toBe(false);
    expect(flattenDetailItems([])).toEqual([]);
    expect(flattenDetailRows([])).toEqual([]);
    expect(groupRowsByReportLabel([])).toEqual(new Map());
  });

  it('reports whether rows have items or subitems', () => {
    const rows = [
      createRow('Mobile', [
        {
          url: 'https://example.com/app.js',
          subItems: {
            items: [{ source: 'script tag' }],
          },
        },
      ]),
      createRow('Desktop', []),
    ];

    expect(getAuditId(rows)).toBe('largest-contentful-paint');
    expect(hasDetailItems(rows)).toBe(true);
    expect(hasDetailSubitems(rows)).toBe(true);
  });

  it('flattens rows into item and subitem records with labels preserved', () => {
    const rows = [
      createRow('Mobile', [
        {
          url: 'https://example.com/app.js',
          subItems: {
            items: [
              { source: 'script tag', transferSize: 1200 },
              { source: 'dynamic import', transferSize: 800 },
            ],
          },
        },
        {
          url: 'https://example.com/styles.css',
        },
      ]),
    ];

    expect(flattenDetailItems(rows)).toEqual([
      {
        url: 'https://example.com/app.js',
        subItems: {
          items: [
            { source: 'script tag', transferSize: 1200 },
            { source: 'dynamic import', transferSize: 800 },
          ],
        },
      },
      {
        url: 'https://example.com/styles.css',
      },
    ]);

    expect(flattenDetailRows(rows)).toEqual([
      {
        item: {
          url: 'https://example.com/app.js',
          subItems: {
            items: [
              { source: 'script tag', transferSize: 1200 },
              { source: 'dynamic import', transferSize: 800 },
            ],
          },
        },
        subitem: { source: 'script tag', transferSize: 1200 },
        _userLabel: 'Mobile',
      },
      {
        item: {
          url: 'https://example.com/app.js',
          subItems: {
            items: [
              { source: 'script tag', transferSize: 1200 },
              { source: 'dynamic import', transferSize: 800 },
            ],
          },
        },
        subitem: { source: 'dynamic import', transferSize: 800 },
        _userLabel: 'Mobile',
      },
      {
        item: {
          url: 'https://example.com/styles.css',
        },
        _userLabel: 'Mobile',
      },
    ]);
  });

  it('groups rows by report label and falls back to Unknown', () => {
    const groupedRows = groupRowsByReportLabel([
      createRow('Mobile', [{ url: 'https://example.com/a.js' }]),
      createRow('Mobile', [{ url: 'https://example.com/b.js' }]),
      createRow('', [{ url: 'https://example.com/c.js' }]),
    ]);

    expect(groupedRows.get('Mobile')).toHaveLength(2);
    expect(groupedRows.get('Unknown')).toHaveLength(1);
  });

  it('treats rows without subitems as not having detail subitems', () => {
    const rows = [
      createRow('Desktop', [
        {
          url: 'https://example.com/app.js',
        },
      ]),
    ];

    expect(hasDetailItems(rows)).toBe(true);
    expect(hasDetailSubitems(rows)).toBe(false);
  });
});
