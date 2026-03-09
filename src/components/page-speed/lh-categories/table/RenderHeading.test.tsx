import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { RenderHeading } from '@/components/page-speed/lh-categories/table/RenderHeading';
import type { TableColumnHeading } from '@/lib/schema';

describe('RenderHeading', () => {
  it('renders string label', () => {
    const heading: TableColumnHeading = {
      key: 'name',
      valueType: 'text',
      label: 'Name',
    };
    const { container } = render(<RenderHeading heading={heading} />);
    expect(container.firstChild).toMatchSnapshot();
  });

  it('renders formattedDefault when label is not a string', () => {
    const heading: TableColumnHeading = {
      key: 'size',
      valueType: 'bytes',
      label: { formattedDefault: 'Transfer Size' },
    } as TableColumnHeading;
    const { container } = render(<RenderHeading heading={heading} />);
    expect(container.firstChild).toMatchSnapshot();
  });

  it('renders empty string when heading is undefined', () => {
    const { container } = render(<RenderHeading />);
    expect(container.firstChild).toMatchSnapshot();
    expect(container.textContent).toBe('');
  });

  it('renders device in parentheses when _device is set', () => {
    const heading: TableColumnHeading = {
      key: 'value',
      valueType: 'numeric',
      label: 'Score',
      _device: 'Mobile',
    };
    const { container } = render(<RenderHeading heading={heading} />);
    expect(container.firstChild).toMatchSnapshot();
  });

  it('merges className and other div props', () => {
    const heading: TableColumnHeading = {
      key: 'x',
      valueType: 'text',
      label: 'X',
    };
    render(
      <RenderHeading heading={heading} className="custom" data-testid="head" />,
    );
    const el = screen.getByTestId('head');
    expect(el).toHaveClass('custom');
    expect(el).toHaveTextContent('X');
  });
});
