import { render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import {
  RenderBasicTable,
  TableContainer,
  NestedTable,
  NestedTableNoCollapse,
  RenderSubItemsHeader,
} from '@/features/page-speed-insights/lh-categories/table/RenderBasicTable';

vi.mock('@/features/page-speed-insights/lh-categories/table/RenderTableHeader', () => ({
  RenderTableHeader: ({ headings }: { headings: { key?: string; label?: string }[] }) => (
    <div data-testid="table-header">
      {headings.map((h) => (
        <span key={h.key}>{h.label}</span>
      ))}
    </div>
  ),
}));

vi.mock('@/features/page-speed-insights/lh-categories/table/RenderTableCell', () => ({
  RenderTableCell: ({
    value,
    heading,
  }: {
    value: unknown;
    heading: { key?: string };
  }) => (
    <div data-testid="table-cell" data-key={heading?.key}>
      {String(value ?? '')}
    </div>
  ),
}));

vi.mock('@/features/page-speed-insights/lh-categories/table/RenderTableValue', () => ({
  RenderTableValue: ({ value }: { value: unknown }) => (
    <span>{String(value ?? '')}</span>
  ),
}));

vi.mock('@/features/page-speed-insights/lh-categories/table/RenderTableRowContainer', () => ({
  RenderTableRowContainer: ({
    children,
  }: {
    children: React.ReactNode;
  }) => <div data-testid="row-container">{children}</div>,
  renderTableRowContainerCss: '',
}));

vi.mock('@/features/page-speed-insights/lh-categories/table/RenderHeading', () => ({
  RenderHeading: ({ heading }: { heading: { key?: string } }) => (
    <div data-testid="heading">{heading?.key}</div>
  ),
}));

vi.mock('@/features/page-speed-insights/lh-categories/table/itemDevice', () => ({
  getItemDevice: (item: { _device?: string }, device: string) =>
    item._device ?? device,
}));

vi.mock('@/components/ui/accordion', () => ({
  Details: ({
    children,
    className,
  }: {
    children: React.ReactNode;
    className?: string;
  }) => <details className={className}>{children}</details>,
}));

const headings = [
  { key: 'name', valueType: 'text', label: 'Name' },
  { key: 'size', valueType: 'bytes', label: 'Size' },
] as const;

describe('RenderBasicTable', () => {
  it('renders title and table header', () => {
    const items = [{ name: 'Item 1', size: 100 }];
    const { container } = render(
      <RenderBasicTable
        headings={headings as any}
        items={items as any}
        device="Desktop"
        title="Test"
      />
    );
    expect(container.textContent).toContain('Test details');
    expect(container.querySelector('[data-testid="table-header"]')).toBeTruthy();
  });

  it('renders items without subItems', () => {
    const items = [{ name: 'A', size: 50 }];
    const { container } = render(
      <RenderBasicTable
        headings={headings as any}
        items={items as any}
        device="Mobile"
        title="Resources"
      />
    );
    expect(container.querySelectorAll('[data-testid="table-cell"]').length).toBeGreaterThan(0);
  });
});

describe('TableContainer', () => {
  it('renders children with grid layout', () => {
    const { container } = render(
      <TableContainer headings={headings as any}>
        <div data-testid="child">content</div>
      </TableContainer>
    );
    expect(container.querySelector('[data-testid="child"]')).toBeTruthy();
    expect(container.firstChild).toHaveClass('grid');
  });
});

describe('NestedTableNoCollapse', () => {
  it('renders main row and subitems when present', () => {
    const item = {
      name: 'Parent',
      size: 100,
      subItems: {
        items: [{ childKey: 'Child 1' }],
      },
    };
    const subHeadings = [
      {
        key: 'name',
        valueType: 'text',
        label: 'Name',
        subItemsHeading: { key: 'childKey', valueType: 'text' },
      },
    ];
    const { container } = render(
      <NestedTableNoCollapse
        item={item as any}
        headings={subHeadings as any}
        device="Desktop"
      />
    );
    expect(container.querySelector('[data-testid="row-container"]')).toBeTruthy();
  });
});

describe('NestedTable', () => {
  it('renders item in details/summary', () => {
    const item = { name: 'X', size: 50 };
    const { container } = render(
      <NestedTable
        item={item as any}
        headings={headings as any}
        device="Desktop"
      />
    );
    expect(container.querySelector('details')).toBeTruthy();
  });
});

describe('RenderSubItemsHeader', () => {
  it('renders subheadings when subItemsHeading present', () => {
    const subHeadings = [
      {
        key: 'parent',
        valueType: 'text',
        label: 'Parent',
        subItemsHeading: { key: 'child', valueType: 'text' },
      },
    ];
    const { container } = render(
      <RenderSubItemsHeader headings={subHeadings as any} />
    );
    expect(container.firstChild).toBeTruthy();
  });

  it('renders row with empty cells when headings have no subItemsHeading', () => {
    const { container } = render(
      <RenderSubItemsHeader headings={[{ key: 'x', valueType: 'text', label: 'X' }] as any} />
    );
    expect(container.querySelector('[data-testid="row-container"]')).toBeTruthy();
    expect(container.querySelector('.col-span-1')).toBeTruthy();
  });
});
