import { render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { LegacyJavaScriptCard } from '@/features/page-speed-insights/javascript-metrics/LegacyJavaScriptCard';

vi.mock('@/features/page-speed-insights/shared/TableCard', () => ({
  TableCard: ({ title }: { title: string }) => (
    <div data-testid="table-card">{title}</div>
  ),
}));

describe('LegacyJavaScriptCard', () => {
  it('returns null when metrics have no legacyJS', () => {
    const { container } = render(
      <LegacyJavaScriptCard
        metrics={[
          { label: 'Mobile', legacyJS: [] },
          { label: 'Desktop', legacyJS: [] },
        ]}
      />
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders TableCard when metrics have legacyJS', () => {
    const { container } = render(
      <LegacyJavaScriptCard
        metrics={[
          {
            label: 'Mobile',
            legacyJS: [
              {
                url: 'https://example.com/script.js',
                wastedBytes: 1000,
                totalBytes: 2000,
              },
            ],
          },
        ]}
      />
    );
    expect(container.querySelector('[data-testid="table-card"]')).toBeTruthy();
    expect(container.textContent).toContain('Legacy JavaScript');
  });
});
