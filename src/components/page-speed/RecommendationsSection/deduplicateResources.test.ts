import { describe, expect, it } from 'vitest';
import { deduplicateResourcesByUrl } from '@/components/page-speed/RecommendationsSection/deduplicateResources';

describe('deduplicateResourcesByUrl', () => {
  it('merges duplicate URLs by keeping the maximum numeric values', () => {
    expect(
      deduplicateResourcesByUrl([
        {
          url: 'https://cdn.example.com/app.js',
          wastedBytes: 4000,
          wastedMs: 120,
          totalBytes: 8000,
          requestCount: 1,
          label: 'first',
        },
        {
          url: 'https://cdn.example.com/app.js',
          wastedBytes: 6000,
          wastedMs: 90,
          totalBytes: 7500,
          requestCount: 2,
          label: 'second',
        },
      ]),
    ).toEqual([
      {
        url: 'https://cdn.example.com/app.js',
        wastedBytes: 6000,
        wastedMs: 120,
        totalBytes: 8000,
        requestCount: 2,
        label: 'second',
      },
    ]);
  });

  it('keeps items without usable URLs as separate rows', () => {
    expect(
      deduplicateResourcesByUrl([
        {
          url: 'Unattributable',
          wastedBytes: 100,
        },
        {
          wastedBytes: 200,
        },
        {
          url: 'https://cdn.example.com/app.js',
          wastedBytes: 300,
        },
        {
          url: 'https://cdn.example.com/app.js',
          wastedBytes: 250,
        },
      ]),
    ).toEqual([
      {
        url: 'https://cdn.example.com/app.js',
        wastedBytes: 300,
      },
      {
        url: 'Unattributable',
        wastedBytes: 100,
      },
      {
        wastedBytes: 200,
      },
    ]);
  });
});
