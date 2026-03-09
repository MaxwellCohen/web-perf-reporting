import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import Loading from '@/app/page-speed/loading';

vi.mock('@/components/common/LoadingMessage', () => ({
  LoadingMessage: () => <div>Mock loading message</div>,
}));

describe('app/page-speed/loading', () => {
  it('renders the shared loading message', () => {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    const { container } = render(<Loading />);

    expect(container.firstChild).toMatchSnapshot();
    expect(logSpy).toHaveBeenCalledWith('loading');

    logSpy.mockRestore();
  });
});
