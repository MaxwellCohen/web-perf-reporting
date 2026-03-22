
import { render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/components/ui/accordion', () => {
  const React = require('react');
  return {
    Details: ({ children, ...props }: { children?: React.ReactNode; [k: string]: unknown }) => (
      <details {...props}>{children}</details>
    ),
  };
});

vi.mock('@/components/ui/table', () => ({
  Table: ({ children }: { children: React.ReactNode }) => <table>{children}</table>,
  TableBody: ({ children }: { children: React.ReactNode }) => <tbody>{children}</tbody>,
  TableCell: ({ children }: { children: React.ReactNode }) => <td>{children}</td>,
  TableHead: ({ children }: { children: React.ReactNode }) => <th>{children}</th>,
  TableHeader: ({ children }: { children: React.ReactNode }) => <thead>{children}</thead>,
  TableRow: ({ children }: { children: React.ReactNode }) => <tr>{children}</tr>,
}));

import { RenderMetricSavings } from '@/features/page-speed-insights/lh-categories/RenderMetricSavings';

describe('RenderMetricSavings', () => {
  it('returns null when no auditData', () => {
    const { container } = render(
      <RenderMetricSavings auditData={undefined} labels={[]} />
    );
    expect(container.firstChild).toBeNull();
  });

  it('returns null when auditData has no metricSavings', () => {
    const { container } = render(
      <RenderMetricSavings
        auditData={[null, { id: 'x', score: null, scoreDisplayMode: 'numeric', title: 'X' }]}
        labels={['Mobile', 'Desktop']}
      />
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders table when auditData has metricSavings', () => {
    const { container } = render(
      <RenderMetricSavings
        auditData={[
          { id: 'a', score: null, scoreDisplayMode: 'metricSavings' as const, title: 'A', metricSavings: { LCP: 100 } },
          { id: 'b', score: null, scoreDisplayMode: 'metricSavings' as const, title: 'B', metricSavings: { LCP: 200 } },
        ]}
        labels={['Mobile', 'Desktop']}
      />
    );
    expect(container.textContent).toContain('Possible Metric Savings');
    expect(container.textContent).toContain('LCP');
  });
});
