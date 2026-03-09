import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { LoadingExperienceGauges } from '@/components/page-speed/LoadingExperienceGauges';

vi.mock('@/components/common/PageSpeedGaugeChart', () => ({
  default: ({ metric }: { metric: string }) => <div data-testid="gauge">{metric}</div>,
}));

describe('LoadingExperienceGauges', () => {
  it('returns null when experience is undefined', () => {
    const { container } = render(<LoadingExperienceGauges />);
    expect(container.firstChild).toBeNull();
  });

  it('returns null when experience is null', () => {
    const { container } = render(<LoadingExperienceGauges experience={null} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders gauge charts for each metric when experience has metrics', () => {
    const experience = {
      metrics: {
        CUMULATIVE_LAYOUT_SHIFT_SCORE: {
          percentile: 0.1,
          category: 'good',
          distributions: [
            { min: 0, max: 0.1, proportion: 0.9 },
            { min: 0.1, max: 0.25, proportion: 0.08 },
            { min: 0.25, max: 1, proportion: 0.02 },
          ],
        },
        EXPERIMENTAL_TIME_TO_FIRST_BYTE: {
          percentile: 100,
          category: 'good',
          distributions: [
            { min: 0, max: 200, proportion: 0.9 },
            { min: 200, max: 600, proportion: 0.08 },
            { min: 600, max: 1400, proportion: 0.02 },
          ],
        },
        FIRST_CONTENTFUL_PAINT_MS: {
          percentile: 500,
          category: 'good',
          distributions: [
            { min: 0, max: 1800, proportion: 0.9 },
            { min: 1800, max: 3000, proportion: 0.08 },
            { min: 3000, max: 6000, proportion: 0.02 },
          ],
        },
        INTERACTION_TO_NEXT_PAINT: {
          percentile: 100,
          category: 'good',
          distributions: [
            { min: 0, max: 200, proportion: 0.9 },
            { min: 200, max: 500, proportion: 0.08 },
            { min: 500, max: 1000, proportion: 0.02 },
          ],
        },
        LARGEST_CONTENTFUL_PAINT_MS: {
          percentile: 1500,
          category: 'good',
          distributions: [
            { min: 0, max: 2500, proportion: 0.9 },
            { min: 2500, max: 4000, proportion: 0.08 },
            { min: 4000, max: 8000, proportion: 0.02 },
          ],
        },
      },
      overall_category: 'good',
    };

    const { container } = render(
      <LoadingExperienceGauges experience={experience} />,
    );

    expect(screen.getAllByTestId('gauge')).toHaveLength(5);
    expect(container.firstChild).toMatchSnapshot();
  });
});
