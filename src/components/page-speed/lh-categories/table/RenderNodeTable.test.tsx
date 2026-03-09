import { render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import {
  RenderNodeTable,
  NodeSummary,
} from '@/components/page-speed/lh-categories/table/RenderNodeTable';

vi.mock('@/components/page-speed/lh-categories/table/RenderNode', () => ({
  RenderNodeImage: ({ item }: { item: { nodeLabel?: string } }) => (
    <div data-testid="node-image">{item?.nodeLabel ?? 'img'}</div>
  ),
}));

vi.mock('@/components/page-speed/lh-categories/table/RenderTableCell', () => ({
  RenderTableCell: ({ value }: { value: unknown }) => (
    <span data-testid="table-cell">{String(value ?? '')}</span>
  ),
}));

vi.mock('@/components/ui/card', () => ({
  Card: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="card">{children}</div>
  ),
}));

vi.mock('@/components/page-speed/lh-categories/table/itemDevice', () => ({
  getItemDevice: (_item: unknown, device: string) => device,
}));

vi.mock('@/components/ui/accordion', () => ({
  Details: ({ children }: { children: React.ReactNode }) => (
    <details>{children}</details>
  ),
}));

const headingsWithNode = [
  { key: 'node', valueType: 'node', label: 'Node' },
  { key: 'size', valueType: 'bytes', label: 'Size' },
];

describe('RenderNodeTable', () => {
  it('returns null when no node header', () => {
    const headings = [{ key: 'name', valueType: 'text', label: 'Name' }];
    const { container } = render(
      <RenderNodeTable
        headings={headings as any}
        items={[]}
        device="Desktop"
        title="Test"
      />
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders title and items when node header present', () => {
    const items = [
      {
        node: { lhId: '1', nodeLabel: 'Label', snippet: 'code' },
        size: 100,
      },
    ];
    const { container } = render(
      <RenderNodeTable
        headings={headingsWithNode as any}
        items={items as any}
        device="Desktop"
        title="Resources"
      />
    );
    expect(container.textContent).toContain('Resources details');
    expect(container.querySelector('[data-testid="card"]')).toBeTruthy();
    expect(container.querySelector('[data-testid="node-image"]')).toBeTruthy();
  });
});

describe('NodeSummary', () => {
  it('returns null for null item', () => {
    const { container } = render(
      <NodeSummary item={null as any} device="Desktop" />
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders text type with value', () => {
    const item = { type: 'text', value: 'Heading Text' };
    const { container } = render(
      <NodeSummary item={item as any} device="Mobile" />
    );
    expect(container.textContent).toContain('Heading Text');
  });

  it('renders nodeLabel and snippet', () => {
    const item = {
      nodeLabel: 'My Node',
      snippet: '<div>html</div>',
    };
    const { container } = render(
      <NodeSummary item={item as any} device="Desktop" />
    );
    expect(container.textContent).toContain('My Node');
    expect(container.textContent).toContain('<div>html</div>');
  });
});
