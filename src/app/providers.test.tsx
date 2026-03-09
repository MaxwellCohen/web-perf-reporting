import { render, screen, waitFor } from '@testing-library/react';
import { useQueryClient } from '@tanstack/react-query';
import { useSWRConfig } from 'swr';
import { describe, expect, it, vi } from 'vitest';

const posthogInitMock = vi.fn();

vi.mock('posthog-js', () => ({
  default: {
    init: (...args: unknown[]) => posthogInitMock(...args),
  },
}));

vi.mock('posthog-js/react', () => ({
  PostHogProvider: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="posthog-provider">{children}</div>
  ),
}));

vi.mock('next-themes', () => ({
  ThemeProvider: ({
    children,
    attribute,
  }: {
    children: React.ReactNode;
    attribute?: string;
  }) => (
    <div data-testid="theme-provider" data-attribute={attribute}>
      {children}
    </div>
  ),
}));

vi.mock('@/app/PostHogPageView', () => ({
  default: () => <div>Mock page view tracker</div>,
}));

import {
  PostHogProvider,
  QueryProvider,
  SWRProvider,
  ThemeProvider,
} from '@/app/providers';

function QueryConsumer() {
  const queryClient = useQueryClient();

  return (
    <div data-testid="query-stale-time">
      {String(queryClient.getDefaultOptions().queries?.staleTime)}
    </div>
  );
}

function SwrConsumer() {
  const { dedupingInterval } = useSWRConfig();

  return <div data-testid="swr-deduping">{String(dedupingInterval)}</div>;
}

describe('app/providers', () => {
  it('provides a configured query client to descendants', () => {
    render(
      <QueryProvider>
        <QueryConsumer />
      </QueryProvider>,
    );

    expect(screen.getByTestId('query-stale-time')).toHaveTextContent('60000');
  });

  it('initializes posthog and renders the tracker with children', () => {
    const { container } = render(
      <PostHogProvider>
        <div>Provider child</div>
      </PostHogProvider>,
    );

    expect(posthogInitMock).toHaveBeenCalledWith('', {
      api_host: undefined,
      person_profiles: 'identified_only',
      capture_pageview: false,
    });
    expect(container.firstChild).toMatchSnapshot();
  });

  it('mounts the next themes provider after the first effect', async () => {
    const { container } = render(
      <ThemeProvider attribute="class">
        <div>Themed child</div>
      </ThemeProvider>,
    );

    expect(container.firstChild).toMatchSnapshot();
    await waitFor(() => {
      expect(screen.getByTestId('theme-provider')).toHaveAttribute(
        'data-attribute',
        'class',
      );
    });
  });

  it('provides the swr config to descendants', () => {
    render(
      <SWRProvider>
        <SwrConsumer />
      </SWRProvider>,
    );

    expect(screen.getByTestId('swr-deduping')).toHaveTextContent('10000');
  });
});
