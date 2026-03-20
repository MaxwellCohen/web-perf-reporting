import type { Route } from 'next';
import type { AnchorHTMLAttributes } from 'react';
import { render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ErrorMessage } from '@/components/common/ErrorMessage';

vi.mock('lucide-react', () => ({
  AlertCircle: () => <span data-testid="alert-icon" />,
}));

vi.mock('@/components/ui/card', () => ({
  Card: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CardContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CardHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CardTitle: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CardDescription: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock('@/components/ui/button', () => ({
  Button: ({
    children,
    asChild,
    ...props
  }: {
    children: React.ReactNode;
    asChild?: boolean;
    [k: string]: unknown;
  }) =>
    asChild ? (
      <>{children}</>
    ) : (
      <button type="button" {...props}>
        {children}
      </button>
    ),
}));

vi.mock('next/link', () => ({
  default: ({
    href,
    children,
    ...props
  }: AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

describe('ErrorMessage', () => {
  it('renders the default error state and navigation actions', () => {
    const { container } = render(<ErrorMessage />);
    expect(container.firstChild).toMatchSnapshot();
  });

  it('renders custom copy and retry destination', () => {
    const { container } = render(
      <ErrorMessage
        title="Custom Error"
        description="A more specific message."
        retryUrl={"/custom-retry" as Route}
      />,
    );
    expect(container.firstChild).toMatchSnapshot();
  });
});
