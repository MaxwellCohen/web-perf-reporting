import { render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { CategoryScoreInfo } from '@/features/page-speed-insights/lh-categories/CategoryScoreInfo';

vi.mock('@/components/common/PageSpeedGaugeChart', () => ({
  HorizontalScoreChart: ({ score }: { score: number }) => (
    <div data-testid="score-chart">{score}</div>
  ),
}));

describe('CategoryScoreInfo', () => {
  it('returns null when category has no score', () => {
    const { container } = render(
      <CategoryScoreInfo category={null} />
    );
    expect(container.firstChild).toBeNull();
  });

  it('returns null when category score is undefined', () => {
    const { container } = render(
      <CategoryScoreInfo category={{}} />
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders score and chart when category has score', () => {
    const { container } = render(
      <CategoryScoreInfo
        category={{ score: 0.85 }}
      />
    );
    expect(container.textContent).toContain('85');
    expect(container.querySelector('[data-testid="score-chart"]')).toBeTruthy();
  });

  it('renders device label when provided', () => {
    const { container } = render(
      <CategoryScoreInfo
        category={{ score: 0.9 }}
        device="Mobile"
      />
    );
    expect(container.textContent).toContain('Mobile');
    expect(container.textContent).toContain('90');
  });
});
