import { act, render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ClientOnly } from '@/features/page-speed-insights/JSUsage/ClientOnly';

describe('ClientOnly', () => {
  it('renders children after client hydration', async () => {
    const { container } = render(
      <ClientOnly>
        <span data-testid="child">Child content</span>
      </ClientOnly>,
    );
    await act(async () => {});
    expect(container.firstChild).toMatchSnapshot();
  });
});
