import { describe, expect, it } from 'vitest';
import {
  NETWORK_REQUESTS_AUDIT_ID,
  NETWORK_REQUESTS_COLUMN_ORDER,
  WATERFALL_REPLACED_NETWORK_REQUEST_KEYS,
  getNetworkRequestsTimeRange,
  isNetworkRequestsAudit,
  isNetworkRequestsTable,
  sortHeadingsByKeyOrder,
} from '@/components/page-speed/shared/networkRequestsTable';

describe('networkRequestsTable', () => {
  it('recognizes the network requests audit id', () => {
    expect(isNetworkRequestsAudit(NETWORK_REQUESTS_AUDIT_ID)).toBe(true);
    expect(isNetworkRequestsAudit('unused-javascript')).toBe(false);
  });

  it('recognizes network requests tables by required timing columns', () => {
    expect(
      isNetworkRequestsTable([
        { key: 'url', label: 'URL' },
        { key: 'networkRequestTime', label: 'Start' },
        { key: 'networkEndTime', label: 'End' },
      ] as any),
    ).toBe(true);

    expect(
      isNetworkRequestsTable([
        { key: 'url', label: 'URL' },
        { key: 'networkRequestTime', label: 'Start' },
      ] as any),
    ).toBe(false);
  });

  it('sorts headings by preferred key order and keeps extras afterward', () => {
    const headings = [
      { key: 'transferSize', label: 'Transfer Size' },
      { key: 'customField', label: 'Custom' },
      { key: 'url', label: 'URL' },
      { key: 'protocol', label: 'Protocol' },
    ] as any;

    expect(
      sortHeadingsByKeyOrder(headings, NETWORK_REQUESTS_COLUMN_ORDER).map(
        (heading) => heading.key,
      ),
    ).toEqual(['url', 'protocol', 'transferSize', 'customField']);
  });

  it('calculates the valid network request time range', () => {
    expect(
      getNetworkRequestsTimeRange([
        { networkRequestTime: 100, networkEndTime: 450 },
        { networkRequestTime: 50, networkEndTime: 300 },
      ]),
    ).toEqual({ minStart: 50, maxEnd: 450 });
  });

  it('returns null when the timing range is invalid or incomplete', () => {
    expect(
      getNetworkRequestsTimeRange([
        { networkRequestTime: 100, networkEndTime: 100 },
      ]),
    ).toBeNull();

    expect(
      getNetworkRequestsTimeRange([
        { networkRequestTime: undefined, networkEndTime: 300 },
        { networkRequestTime: 100, networkEndTime: undefined },
      ]),
    ).toEqual({ minStart: 100, maxEnd: 300 });

    expect(
      getNetworkRequestsTimeRange([
        { networkRequestTime: undefined, networkEndTime: undefined },
      ]),
    ).toBeNull();
  });

  it('keeps the replaced timing keys aligned with the waterfall columns', () => {
    expect(WATERFALL_REPLACED_NETWORK_REQUEST_KEYS).toEqual([
      'networkRequestTime',
      'networkEndTime',
    ]);
  });
});
