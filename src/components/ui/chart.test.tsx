import { render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="responsive-container">{children}</div>
  ),
  Tooltip: (props: React.HTMLAttributes<HTMLDivElement>) => (
    <div data-testid="tooltip" {...props} />
  ),
  Legend: (props: React.HTMLAttributes<HTMLDivElement>) => (
    <div data-testid="legend" {...props} />
  ),
}));

import {
  ChartContainer,
  ChartLegendContent,
  ChartStyle,
  ChartTooltipContent,
} from '@/components/ui/chart';

const chartConfig = {
  sales: { label: 'Sales', color: '#111111' },
  visitors: {
    label: 'Visitors',
    color: '#333333',
  },
};

describe('ui/chart', () => {
  it('renders chart children inside a responsive container and injects styles', () => {
    const { container } = render(
      <ChartContainer config={chartConfig} id="revenue">
        <div>Chart body</div>
      </ChartContainer>,
    );

    expect(container.firstChild).toMatchSnapshot();
    expect(container.querySelector('style')).toHaveTextContent('--color-sales');
  });

  it('renders tooltip content from the provided config and payload', () => {
    const { container } = render(
      <ChartContainer config={chartConfig}>
        <ChartTooltipContent
          active
          label="sales"
          payload={[
            {
              dataKey: 'sales',
              name: 'sales',
              value: 42,
              color: '#111111',
              payload: { fill: '#111111' },
            },
          ]}
        />
      </ChartContainer>,
    );

    expect(container.textContent).toContain('Sales');
    expect(container.firstChild).toMatchSnapshot();
  });

  it('supports custom label formatting and legend rendering', () => {
    const { container } = render(
      <ChartContainer config={chartConfig}>
        <div>
          <ChartTooltipContent
            active
            label="visitors"
            labelFormatter={(value) => `Label: ${String(value)}`}
            payload={[
              {
                dataKey: 'visitors',
                name: 'visitors',
                value: 13,
                color: '#333333',
                payload: { visitors: 'visitors' },
              },
            ]}
          />
          <ChartLegendContent
            payload={[
              { dataKey: 'sales', value: 'sales', color: '#111111' },
              { dataKey: 'visitors', value: 'visitors', color: '#333333' },
            ]}
          />
        </div>
      </ChartContainer>,
    );

    expect(container.firstChild).toMatchSnapshot();
    expect(container.textContent).toContain('Visitors');
  });

  it('returns nothing when there is no color config or inactive tooltip', () => {
    const { container } = render(
      <div>
        <ChartStyle id="empty-chart" config={{}} />
        <ChartContainer config={chartConfig}>
          <ChartTooltipContent active={false} payload={[]} />
        </ChartContainer>
      </div>,
    );

    expect(container.querySelectorAll('style')).toHaveLength(1);
    expect(container.firstChild).toMatchSnapshot();
  });
});
