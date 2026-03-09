import { render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { RenderTableCell } from '@/components/page-speed/lh-categories/table/RenderTableCell';

vi.mock('@/components/page-speed/lh-categories/table/RenderTableValue', () => ({
  RenderTableValue: ({
    value,
    heading,
    device,
    className,
  }: {
    value?: unknown;
    heading: unknown;
    device: string;
    className?: string;
  }) => (
    <span
      data-testid="table-value"
      data-value={String(value)}
      data-device={device}
      className={className}
    >
      {String(value ?? '')}
    </span>
  ),
}));

describe('RenderTableCell', () => {
  it('renders value via RenderTableValue', () => {
    const { container } = render(
      <RenderTableCell
        value="test"
        heading={{ key: 'x', valueType: 'text', label: 'X' }}
        device="Desktop"
      />
    );
    const el = container.querySelector('[data-testid="table-value"]');
    expect(el).toBeTruthy();
    expect(el?.getAttribute('data-value')).toBe('test');
    expect(el?.getAttribute('data-device')).toBe('Desktop');
  });

  it('renders with undefined value', () => {
    const { container } = render(
      <RenderTableCell
        value={undefined}
        heading={null}
        device="Mobile"
      />
    );
    expect(container.querySelector('[data-testid="table-value"]')).toBeTruthy();
  });

  it('passes through className to RenderTableValue', () => {
    const { container } = render(
      <RenderTableCell
        value={42}
        heading={{ key: 'n', valueType: 'numeric', label: 'N' }}
        device="Desktop"
        className="custom-class"
      />
    );
    const el = container.querySelector('.custom-class');
    expect(el).toBeTruthy();
  });
});
