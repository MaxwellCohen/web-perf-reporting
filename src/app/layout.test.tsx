import { render } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { suppressConsoleError } from '@/test-utils';

vi.mock('next/font/google', () => ({
  Geist: () => ({ variable: 'font-geist-sans' }),
  Geist_Mono: () => ({ variable: 'font-geist-mono' }),
}));

vi.mock('@/app/providers', () => ({
  PostHogProvider: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
  QueryProvider: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
}));

vi.mock('@/components/navigation/TopNav', () => ({
  TopNav: () => <nav>Mock top nav</nav>,
}));

import RootLayout, { metadata } from '@/app/layout';

describe('app/layout', () => {
  beforeEach(() => suppressConsoleError());

  it('exports the expected metadata', () => {
    expect(metadata.title).toBe('Web Performance Report');
    expect(metadata.description).toBe(
      'Web performance report from CRUX data',
    );
  });

  it('renders the shared layout shell around the page content', () => {
    const { container } = render(
      <RootLayout>
        <div>Page content</div>
      </RootLayout>,
    );

    expect(document.documentElement).toHaveAttribute('lang', 'en');
    expect(document.documentElement).toHaveClass('dark');
    expect(container.firstChild).toMatchSnapshot();
    expect(document.body).toHaveClass(
      'font-geist-sans',
      'font-geist-mono',
      'antialiased',
    );
  });
});
