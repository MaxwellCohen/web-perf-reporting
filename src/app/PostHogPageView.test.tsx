import { render } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const captureMock = vi.fn();
let pathnameValue: string | null = '/reports';
let searchParamsValue = new URLSearchParams('device=mobile');
let posthogValue: { capture: typeof captureMock } | null = {
  capture: captureMock,
};

vi.mock('next/navigation', () => ({
  usePathname: () => pathnameValue,
  useSearchParams: () => searchParamsValue,
}));

vi.mock('posthog-js/react', () => ({
  usePostHog: () => posthogValue,
}));

import PostHogPageView from '@/app/PostHogPageView';

describe('app/PostHogPageView', () => {
  beforeEach(() => {
    captureMock.mockReset();
    pathnameValue = '/reports';
    searchParamsValue = new URLSearchParams('device=mobile');
    posthogValue = { capture: captureMock };
    // happy-dom has undefined origin by default; stub for URL construction
    Object.defineProperty(window, 'origin', {
      value: 'http://localhost:3000',
      writable: true,
      configurable: true,
    });
  });

  it('captures a pageview with the current path and query string', () => {
    render(<PostHogPageView />);

    expect(captureMock).toHaveBeenCalledWith('$pageview', {
      $current_url: 'http://localhost:3000/reports?device=mobile',
    });
  });

  it('skips tracking when pathname or posthog is unavailable', () => {
    pathnameValue = null;
    posthogValue = null;

    render(<PostHogPageView />);

    expect(captureMock).not.toHaveBeenCalled();
  });
});
