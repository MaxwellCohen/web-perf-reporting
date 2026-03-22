import * as React from 'react';
import { render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { Timeline } from '@/features/page-speed-insights/Timeline';

vi.mock('@/components/ui/button', () => ({
  Button: ({ children, ...props }: { children: React.ReactNode }) => (
    <button type="button" {...props}>
      {children}
    </button>
  ),
}));

vi.mock('@/components/ui/dialog', () => ({
  Dialog: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  DialogTrigger: ({
    children,
    asChild,
  }: {
    children: React.ReactNode;
    asChild?: boolean;
  }) => {
    if (asChild && React.isValidElement(children)) {
      return React.cloneElement(children, {
        type: 'button',
        'aria-haspopup': 'dialog',
        'aria-expanded': false,
        'aria-controls': 'radix-_r_0_',
        'data-state': 'closed',
      } as React.HTMLAttributes<HTMLElement>);
    }
    return <button type="button">{children}</button>;
  },
  DialogContent: () => null,
  DialogTitle: ({ children }: { children: React.ReactNode }) => (
    <h2>{children}</h2>
  ),
  DialogClose: ({
    children,
    asChild,
  }: {
    children: React.ReactNode;
    asChild?: boolean;
  }) => (asChild ? <>{children}</> : <button type="button">{children}</button>),
}));

vi.mock('@/components/ui/carousel', () => ({
  Carousel: ({
    children,
    setApi,
  }: {
    children: React.ReactNode;
    setApi?: (api: { scrollTo: (i: number) => void }) => void;
  }) => {
    React.useEffect(() => {
      setApi?.({ scrollTo: () => {} });
    }, [setApi]);
    return <div data-testid="carousel">{children}</div>;
  },
  CarouselContent: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  CarouselItem: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  CarouselNext: () => <button type="button">Next</button>,
  CarouselPrevious: () => <button type="button">Prev</button>,
}));

/** Normalize radix IDs to radix-_r_0_ for stable snapshots regardless of test order */
function normalizeRadixIds(html: string) {
  return html.replace(/radix-_r_\d+_/g, 'radix-_r_0_');
}

describe('Timeline', () => {
  it('returns null when timeline is undefined', () => {
    const { container } = render(<Timeline />);
    expect(container.firstChild).toBeNull();
  });

  it('returns null when timeline has no items', () => {
    const { container } = render(
      <Timeline timeline={{ type: 'filmstrip', items: [], scale: 1 }} />,
    );
    expect(container.firstChild).toBeNull();
  });

  it('returns null when timeline.items is undefined', () => {
    const { container } = render(
      <Timeline timeline={{ type: 'filmstrip' } as any} />,
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders timeline with device label', () => {
    const timeline = {
      type: 'filmstrip' as const,
      items: [
        { data: 'data:image/png;base64,a', timestamp: 0, timing: 100 },
        { data: 'data:image/png;base64,b', timestamp: 100, timing: 200 },
      ],
      scale: 1,
    };
    const { container } = render(
      <Timeline timeline={timeline} device="Mobile" />,
    );
    const html = (container.firstChild as HTMLElement)?.outerHTML ?? '';
    expect(normalizeRadixIds(html)).toMatchSnapshot();
  });

  it('renders timeline without device label', () => {
    const timeline = {
      type: 'filmstrip' as const,
      items: [{ data: 'data:image/png;base64,a', timestamp: 0, timing: 50 }],
      scale: 1,
    };
    const { container } = render(<Timeline timeline={timeline} />);
    const html = (container.firstChild as HTMLElement)?.outerHTML ?? '';
    expect(normalizeRadixIds(html)).toMatchSnapshot();
  });

  it('renders thumbnail buttons for each timeline item', () => {
    const timeline = {
      type: 'filmstrip' as const,
      items: [
        { data: 'data:image/png;base64,a', timestamp: 0, timing: 100 },
        { data: 'data:image/png;base64,b', timestamp: 100, timing: 200 },
      ],
      scale: 1,
    };
    const { container } = render(<Timeline timeline={timeline} />);
    const html = (container.firstChild as HTMLElement)?.outerHTML ?? '';
    expect(normalizeRadixIds(html)).toMatchSnapshot();
  });
});
