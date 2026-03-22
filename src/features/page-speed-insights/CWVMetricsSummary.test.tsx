import { render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import {
  PageSpeedInsightsStoreProvider,
  usePageSpeedInsightsStore,
} from '@/features/page-speed-insights/PageSpeedContext';
import { CWVMetricsSummary } from '@/features/page-speed-insights/CWVMetricsSummary';

vi.mock('@/features/page-speed-insights/JSUsage/JSUsageSection', () => ({
  JSUsageSection: () => <div data-testid="js-usage">JS Usage</div>,
}));

vi.mock('@/features/page-speed-insights/lh-categories/table/RenderTableValue', () => ({
  RenderBytesValue: ({ value }: { value: number }) => (
    <span>{value} bytes</span>
  ),
  RenderMSValue: ({ value }: { value: number }) => (
    <span>{Math.round(Number(value))} ms</span>
  ),
}));

vi.mock('@/components/ui/accordion', () => ({
  Details: ({ children, ...props }: React.HTMLAttributes<HTMLDetailsElement>) => (
    <details {...props}>{children}</details>
  ),
}));

vi.mock('@/components/ui/card', () => ({
  Card: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CardHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock('@/components/ui/table', () => ({
  Table: ({ children }: { children: React.ReactNode }) => <table>{children}</table>,
  TableHeader: ({ children }: { children: React.ReactNode }) => <thead>{children}</thead>,
  TableBody: ({ children }: { children: React.ReactNode }) => <tbody>{children}</tbody>,
  TableRow: ({ children }: { children: React.ReactNode }) => <tr>{children}</tr>,
  TableHead: ({ children }: { children: React.ReactNode }) => <th>{children}</th>,
  TableCell: ({ children }: { children: React.ReactNode }) => <td>{children}</td>,
}));

function TestWrapper({
  children,
  data,
  labels,
}: {
  children: React.ReactNode;
  data: any[];
  labels: string[];
}) {
  const store = usePageSpeedInsightsStore({ data, labels, isLoading: false });
  return (
    <PageSpeedInsightsStoreProvider store={store}>
      {children}
    </PageSpeedInsightsStoreProvider>
  );
}

function createMetricsItem(overrides: Record<string, unknown> = {}) {
  return {
    firstContentfulPaint: 500,
    largestContentfulPaint: 1500,
    totalBlockingTime: 100,
    cumulativeLayoutShift: 0.05,
    speedIndex: 1200,
    ...overrides,
  };
}

describe('CWVMetricsSummary', () => {
  it('returns null when no items have metrics', () => {
    const data = [
      {
        lighthouseResult: {
          audits: {},
        },
      },
    ];
    const { container } = render(
      <TestWrapper data={data} labels={['Mobile']}>
        <CWVMetricsSummary />
      </TestWrapper>,
    );
    expect(container.querySelector('details')).toBeNull();
  });

  it('renders Summary Metrics when items have metrics and diagnostics', () => {
    const metricsItem = createMetricsItem();
    const diagnosticsItem = { numRequests: 10, numScripts: 5 };
    const data = [
      {
        lighthouseResult: {
          audits: {
            metrics: {
              details: { items: [metricsItem] },
            },
            diagnostics: {
              details: { items: [diagnosticsItem] },
            },
          },
        },
      },
    ];
    const { container } = render(
      <TestWrapper data={data} labels={['Mobile']}>
        <CWVMetricsSummary />
      </TestWrapper>,
    );
    expect(container.firstChild).toMatchSnapshot();
  });

  it('renders Network Request Summary when network-requests audit exists', () => {
    const metricsItem = createMetricsItem();
    const networkItems = [
      { resourceType: 'script', transferSize: 1000, resourceSize: 800 },
      { resourceType: 'stylesheet', transferSize: 500, resourceSize: 400 },
    ];
    const data = [
      {
        lighthouseResult: {
          audits: {
            metrics: { details: { items: [metricsItem] } },
            diagnostics: { details: { items: [{ numRequests: 2 }] } },
            'network-requests': {
              details: {
                type: 'table',
                items: networkItems,
              },
            },
          },
        },
      },
    ];
    const { container } = render(
      <TestWrapper data={data} labels={['Mobile']}>
        <CWVMetricsSummary />
      </TestWrapper>,
    );
    expect(container.firstChild).toMatchSnapshot();
  });
});
