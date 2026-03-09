import { render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { NodeComponent, RenderNodeImage } from '@/components/page-speed/lh-categories/table/RenderNode';

vi.mock('@/components/page-speed/PageSpeedContext', () => ({
  useFullPageScreenshots: vi.fn(() => ({})),
}));

vi.mock('@/components/page-speed/RenderJSONDetails', () => ({
  RenderJSONDetails: ({ data }: { data: unknown }) => (
    <div data-testid="json-details">{JSON.stringify(data)}</div>
  ),
}));

vi.mock('@/components/ui/dialog', () => ({
  Dialog: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogTrigger: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogTitle: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogClose: ({ children, asChild }: { children: React.ReactNode; asChild?: boolean }) =>
    asChild ? <>{children}</> : <div>{children}</div>,
}));

vi.mock('@/components/ui/button', () => ({
  Button: ({ children }: { children: React.ReactNode }) => <button>{children}</button>,
}));

describe('NodeComponent', () => {
  it('returns null for invalid item', () => {
    const { container } = render(<NodeComponent item={null as any} device="Mobile" />);
    expect(container.firstChild).toBeNull();
  });

  it('returns null for non-object item', () => {
    const { container } = render(<NodeComponent item={undefined as any} device="Mobile" />);
    expect(container.firstChild).toBeNull();
  });

  it('renders node with snippet', () => {
    const item = { type: 'node' as const, lhId: '1', nodeLabel: 'Label', snippet: '<div>test</div>' };
    const { container } = render(<NodeComponent item={item} device="Mobile" />);
    expect(container.textContent).toContain('<div>test</div>');
    expect(container.querySelector('[data-testid="json-details"]')).toBeTruthy();
  });

  it('renders node without snippet', () => {
    const item = { type: 'node' as const, lhId: '2', nodeLabel: 'Only Label' };
    const { container } = render(<NodeComponent item={item} device="Desktop" />);
    expect(container.textContent).toContain('Only Label');
  });
});

describe('RenderNodeImage', () => {
  it('returns null for invalid item', () => {
    const { container } = render(<RenderNodeImage item={null as any} device="Mobile" />);
    expect(container.firstChild).toBeNull();
  });

  it('returns null when no screenshot data', () => {
    const item = { type: 'node' as const, lhId: '1', nodeLabel: 'Test' };
    const { container } = render(<RenderNodeImage item={item} device="Mobile" />);
    expect(container.firstChild).toBeNull();
  });
});
