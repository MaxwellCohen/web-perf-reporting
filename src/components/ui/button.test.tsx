import * as React from 'react';
import { render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Button } from '@/components/ui/button';

vi.mock('@radix-ui/react-slot', () => ({
  Slot: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) =>
    React.isValidElement(children)
      ? React.cloneElement(children as React.ReactElement<Record<string, unknown>>, props as Record<string, unknown>)
      : React.createElement('span', props, children),
}));

describe('Button', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('renders a native button with the default styles', () => {
    const { container } = render(<Button>Save</Button>);
    const button = container.querySelector('button');
    expect(button?.tagName).toBe('BUTTON');
    expect(button).toHaveClass('bg-primary');
    expect(button).toHaveClass('h-9');
    expect(button?.textContent).toBe('Save');
  });

  it('renders the child element when asChild is enabled', () => {
    const { container } = render(
      <Button asChild variant="outline" size="sm">
        <a href="/reports">Open reports</a>
      </Button>,
    );
    const link = container.querySelector('a[href="/reports"]');
    expect(link).toHaveAttribute('href', '/reports');
    expect(link).toHaveClass('border');
    expect(link).toHaveClass('h-8');
  });
});
