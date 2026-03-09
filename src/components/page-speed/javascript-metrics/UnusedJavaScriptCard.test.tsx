import { render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { UnusedJavaScriptCard } from '@/components/page-speed/javascript-metrics/UnusedJavaScriptCard';

vi.mock('@/components/page-speed/shared/TableCard', () => ({
  TableCard: ({ title }: { title: string }) => (
    <div data-testid="table-card">{title}</div>
  ),
}));

describe('UnusedJavaScriptCard', () => {
  it('returns null when metrics have no unusedJS', () => {
    const { container } = render(
      <UnusedJavaScriptCard
        metrics={[
          { label: 'Mobile', unusedJS: [] },
          { label: 'Desktop', unusedJS: [] },
        ]}
      />
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders TableCard when metrics have unusedJS', () => {
    const { container } = render(
      <UnusedJavaScriptCard
        metrics={[
          {
            label: 'Mobile',
            unusedJS: [
              {
                url: 'https://example.com/script.js',
                wastedBytes: 500,
                totalBytes: 1000,
                wastedPercent: 50,
              },
            ],
          },
        ]}
      />
    );
    expect(container.querySelector('[data-testid="table-card"]')).toBeTruthy();
    expect(container.textContent).toContain('Unused JavaScript');
  });
});
