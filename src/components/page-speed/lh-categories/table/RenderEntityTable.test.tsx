import { render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { RenderEntityTable } from '@/components/page-speed/lh-categories/table/RenderEntityTable';

vi.mock('@/components/page-speed/lh-categories/table/RenderTableHeader', () => ({
  RenderTableHeader: () => <div data-testid="table-header" />,
}));

vi.mock('@/components/page-speed/lh-categories/table/RenderTableCell', () => ({
  RenderTableCell: ({ value }: { value: unknown }) => (
    <span data-testid="table-cell">{String(value ?? '')}</span>
  ),
}));

vi.mock('@/components/page-speed/lh-categories/table/RenderTableRowContainer', () => ({
  RenderTableRowContainer: ({
    children,
  }: {
    children: React.ReactNode;
  }) => <div data-testid="row">{children}</div>,
}));

const headings = [
  { key: 'entity', valueType: 'text', label: 'Entity' },
  { key: 'size', valueType: 'bytes', label: 'Size' },
];

describe('RenderEntityTable', () => {
  it('renders header and rows when entity items present', () => {
    const items = [
      { entity: 'A', size: 100, _device: 'Desktop' },
      { entity: 'A', size: 50, _device: 'Desktop' },
    ];
    const { container } = render(
      <RenderEntityTable
        headings={headings as any}
        items={items as any}
        device="Desktop"
        isEntityGrouped={true}
        skipSumming={[]}
        sortedBy={[]}
      />
    );
    expect(container.querySelector('[data-testid="table-header"]')).toBeTruthy();
    expect(container.querySelectorAll('[data-testid="row"]').length).toBeGreaterThan(0);
  });

  it('renders empty grid when getEntityGroupItems returns empty', () => {
    const { container } = render(
      <RenderEntityTable
        headings={headings as any}
        items={[]}
        device="Desktop"
        isEntityGrouped={false}
        skipSumming={[]}
        sortedBy={[]}
      />
    );
    expect(container.firstChild).toHaveClass('grid');
  });
});
