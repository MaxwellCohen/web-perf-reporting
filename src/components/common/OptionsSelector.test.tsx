import type { ReactNode } from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { OptionsSelector } from '@/components/common/OptionsSelector';

const chartSelectorSpy = vi.fn();

vi.mock('@/components/common/ChartSelector', () => ({
  ChartSelector: ({
    id,
    options,
    onValueChange,
  }: {
    id: string;
    options: unknown[];
    onValueChange: (value: string) => void;
  }) => {
    chartSelectorSpy({ id, options, onValueChange });
    return <div data-testid="chart-selector">Chart selector</div>;
  },
}));

vi.mock('@/components/ui/label', () => ({
  Label: ({
    children,
    htmlFor,
  }: {
    children: ReactNode;
    htmlFor?: string;
  }) => <label htmlFor={htmlFor}>{children}</label>,
}));

describe('OptionsSelector', () => {
  it('renders the title label and passes props through to ChartSelector', () => {
    const { container } = render(
      <OptionsSelector
        id="metric-selector"
        title="Metric"
        options={['LCP', 'CLS']}
        onValueChange={() => {}}
      />,
    );

    expect(container.firstChild).toMatchSnapshot();
    expect(chartSelectorSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'metric-selector',
        options: ['LCP', 'CLS'],
      }),
    );
  });
});
