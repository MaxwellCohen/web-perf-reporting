import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ScreenshotComponent } from '@/components/page-speed/ScreenshotComponent';

describe('ScreenshotComponent', () => {
  it('returns null when screenshot is undefined', () => {
    const { container } = render(<ScreenshotComponent />);
    expect(container.firstChild).toBeNull();
  });

  it('returns null when screenshot is null', () => {
    const { container } = render(<ScreenshotComponent screenshot={null} />);
    expect(container.firstChild).toBeNull();
  });

  it('shows "Image unavailable" when screenshot.data is empty', () => {
    const { container } = render(
      <ScreenshotComponent
        screenshot={{ data: '', width: 100, height: 80 }}
      />,
    );
    expect(container.firstChild).toMatchSnapshot();
  });

  it('renders image when screenshot has valid data', () => {
    const screenshot = {
      data: 'data:image/png;base64,abc123',
      width: 100,
      height: 80,
    };
    const { container } = render(
      <ScreenshotComponent screenshot={screenshot} />,
    );
    const img = screen.getByAltText('fullscreen image');
    expect(container.firstChild).toMatchSnapshot();
    expect(img).toHaveAttribute('src', screenshot.data);
    expect(img).toHaveAttribute('width', '80');
  });

  it('shows "Image unavailable" when image fails to load', () => {
    const screenshot = {
      data: 'invalid-url-that-will-fail',
      width: 100,
      height: 80,
    };
    const { container } = render(
      <ScreenshotComponent screenshot={screenshot} />,
    );
    const img = screen.getByAltText('fullscreen image');

    fireEvent.error(img);

    expect(container.firstChild).toMatchSnapshot();
  });
});
