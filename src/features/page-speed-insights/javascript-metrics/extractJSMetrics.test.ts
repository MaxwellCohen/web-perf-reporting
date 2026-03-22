import { describe, expect, it } from 'vitest';
import { extractJSMetrics } from '@/features/page-speed-insights/javascript-metrics/extractJSMetrics';

describe('extractJSMetrics', () => {
  it('returns empty metric lists when Lighthouse audits are missing', () => {
    expect(
      extractJSMetrics({
        label: 'Mobile',
        item: {} as any,
      }),
    ).toEqual({
      label: 'Mobile',
      bootupTime: [],
      mainThreadWork: [],
      unusedJS: [],
      unminifiedJS: [],
      legacyJS: [],
      diagnostics: [],
      mainThreadTasks: [],
      jsResources: [],
    });
  });

  it('extracts JavaScript audit tables and filters network requests to scripts', () => {
    const bootupTime = [{ url: 'https://example.com/app.js', wastedMs: 125 }];
    const diagnostics = [{ numTasksOver10ms: 3 }];
    const networkRequests = [
      { url: 'https://example.com/app.js', resourceType: 'Script' },
      { url: 'https://example.com/styles.css', resourceType: 'Stylesheet' },
      { url: 'https://example.com/vendor.js', resourceType: 'script' },
    ];

    expect(
      extractJSMetrics({
        label: 'Desktop',
        item: {
          lighthouseResult: {
            audits: {
              'bootup-time': {
                details: {
                  items: bootupTime,
                },
              },
              diagnostics: {
                details: {
                  items: diagnostics,
                },
              },
              'network-requests': {
                details: {
                  items: networkRequests,
                },
              },
            },
          },
        } as any,
      }),
    ).toEqual({
      label: 'Desktop',
      bootupTime,
      mainThreadWork: [],
      unusedJS: [],
      unminifiedJS: [],
      legacyJS: [],
      diagnostics,
      mainThreadTasks: [],
      jsResources: [
        { url: 'https://example.com/app.js', resourceType: 'Script' },
        { url: 'https://example.com/vendor.js', resourceType: 'script' },
      ],
    });
  });

  it('returns empty JavaScript resources when network requests are unavailable', () => {
    expect(
      extractJSMetrics({
        label: 'Desktop',
        item: {
          lighthouseResult: {
            audits: {
              'mainthread-work-breakdown': {
                details: {
                  items: [{ group: 'script evaluation', duration: 40 }],
                },
              },
              'network-requests': {
                details: {},
              },
            },
          },
        } as any,
      }),
    ).toEqual({
      label: 'Desktop',
      bootupTime: [],
      mainThreadWork: [{ group: 'script evaluation', duration: 40 }],
      unusedJS: [],
      unminifiedJS: [],
      legacyJS: [],
      diagnostics: [],
      mainThreadTasks: [],
      jsResources: [],
    });
  });
});
