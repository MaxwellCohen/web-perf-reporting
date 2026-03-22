import type { ReactNode } from 'react';
import { fireEvent, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ChartSelector } from '@/components/common/ChartSelector';

vi.mock('@/components/ui/select', () => ({
  Select: ({
    children,
    onValueChange,
  }: {
    children: ReactNode;
    onValueChange: (value: string) => void;
  }) => (
    <div
      data-testid="mock-select"
      onChange={(event) =>
        onValueChange((event.target as unknown as HTMLSelectElement).value)
      }
    >
      {children}
    </div>
  ),
  SelectTrigger: ({ children, id }: { children: ReactNode; id?: string }) => (
    <div data-testid="mock-trigger" id={id}>
      {children}
    </div>
  ),
  SelectValue: ({ placeholder }: { placeholder?: string }) => (
    <span>{placeholder}</span>
  ),
  SelectContent: ({ children }: { children: ReactNode }) => (
    <select aria-label="Chart selector">{children}</select>
  ),
  SelectItem: ({ children, value }: { children: ReactNode; value: string }) => (
    <option value={value}>{children}</option>
  ),
}));

describe('ChartSelector', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('normalizes string options and uses the first option as the placeholder', () => {
    const onValueChange = vi.fn();
    const { container } = render(
      <ChartSelector
        id="chart-selector"
        options={['LCP', 'CLS']}
        onValueChange={onValueChange}
      />,
    );

    const trigger = container.querySelector('[data-testid="mock-trigger"]');
    expect(trigger).toHaveTextContent('LCP');
    expect(trigger).toHaveAttribute('id', 'chart-selector');

    const select = container.querySelector('select[aria-label="Chart selector"]');
    fireEvent.change(select!, { target: { value: 'CLS' } });
    expect(onValueChange).toHaveBeenCalledWith('CLS');
  });

  it('supports labeled option objects', () => {
    const onValueChange = vi.fn();
    const { container } = render(
      <ChartSelector
        options={[
          { label: 'Largest Contentful Paint', value: 'LCP' },
          { label: 'Cumulative Layout Shift', value: 'CLS' },
        ]}
        onValueChange={onValueChange}
      />,
    );

    expect(container.querySelector('[data-testid="mock-trigger"]')).toHaveTextContent('Largest Contentful Paint');
    expect(container.querySelector('option[value="CLS"]')).toHaveTextContent('Cumulative Layout Shift');
  });
});
