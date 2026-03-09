import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { RenderTableHeader } from '@/components/page-speed/lh-categories/table/RenderTableHeader';
import type { TableColumnHeading } from '@/lib/schema';

describe('RenderTableHeader', () => {
  it('renders a heading for each column', () => {
    const headings: TableColumnHeading[] = [
      { key: 'a', valueType: 'text', label: 'Column A' },
      { key: 'b', valueType: 'numeric', label: 'Column B' },
    ];
    const { container } = render(
      <RenderTableHeader headings={headings} />,
    );
    expect(container.firstChild).toMatchSnapshot();
  });

  it('renders nothing when headings is empty', () => {
    const { container } = render(<RenderTableHeader headings={[]} />);
    const row = container.querySelector('.grid');
    expect(container.firstChild).toMatchSnapshot();
    expect(row?.childNodes.length).toBe(0);
  });

  it('applies header class to headings', () => {
    const headings: TableColumnHeading[] = [
      { key: 'x', valueType: 'text', label: 'Header X' },
    ];
    render(<RenderTableHeader headings={headings} />);
    const el = screen.getByText('Header X').closest('div');
    expect(el?.className).toMatch(/uppercase|tracking-wider|text-muted/);
  });
});
