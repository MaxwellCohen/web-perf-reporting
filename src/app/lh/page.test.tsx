import { render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/components/lh/input-form', () => ({
  LhInputForm: () => <div>Lighthouse Report Viewer</div>,
}));

import LhPage from '@/app/lh/page';

describe('app/lh/page', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders LhInputForm inside a max-w container', async () => {
    const params = { route: 'lh', searchParams: {} };
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    const Page = await LhPage(params);
    const { container } = render(Page);

    expect(container.firstChild).toMatchSnapshot();
    expect(logSpy).toHaveBeenCalledWith(params);
  });

  it('logs arbitrary params', async () => {
    const params = { foo: 'bar', count: 1 };
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    const Page = await LhPage(params);
    render(Page);

    expect(logSpy).toHaveBeenCalledWith(params);
  });
});
