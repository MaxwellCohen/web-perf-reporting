import type { FullPageScreenshot, Rect } from "@/lib/schema";

/**
 * Size type definition
 */
export interface Size {
  /** Width in pixels */
  width: number;
  /** Height in pixels */
  height: number;
}

/**
 * Position type definition
 */
export interface Position {
  /** Left position in pixels */
  left: number;
  /** Top position in pixels */
  top: number;
}

/**
 * Screenshot positions type definition
 */
export interface ScreenshotPositions {
  /** Screenshot position */
  screenshot: Position;
  /** Clip position */
  clip: Position;
}

/**
 * Helper function to check if screenshot overlaps with the element rect
 * @param screenshot - The screenshot object with width and height
 * @param rect - The element rect with left, right, top, bottom
 * @return Whether the screenshot overlaps with the rect
 */
export function screenshotOverlapsRect(
  screenshot: FullPageScreenshot["screenshot"],
  rect: Rect,
): boolean {
  return (
    rect?.left <= screenshot.width &&
    0 <= rect?.right &&
    rect?.top <= screenshot.height &&
    0 <= rect?.bottom
  );
}

/**
 * Helper function to clamp a value between min and max
 * @param value - The value to clamp
 * @param min - The minimum value
 * @param max - The maximum value
 * @return The clamped value
 */
function clamp(value: number, min: number, max: number): number {
  if (value < min) return min;
  if (value > max) return max;
  return value;
}

/**
 * Helper function to get the center point of a rect
 * @param rect - The rectangle
 * @return The center point of the rectangle
 */
function getElementRectCenterPoint(rect: Rect): {
  x: number;
  y: number;
} {
  return {
    x: rect.left + rect.width / 2,
    y: rect.top + rect.height / 2,
  };
}

/**
 * Generate a unique ID for SVG clip paths
 * @return A unique ID string
 */
export function getUniqueId(): string {
  return `clip-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Calculate screenshot positions based on element rect and preview size
 * @param elementRectSC - Element rect in screenshot coordinates
 * @param elementPreviewSizeSC - Preview size in screenshot coordinates
 * @param screenshotSize - Screenshot size
 * @return The screenshot positions
 */
export function getScreenshotPositions(
  elementRectSC: Rect,
  elementPreviewSizeSC: Size,
  screenshotSize: Size,
): ScreenshotPositions {
  const elementRectCenter = getElementRectCenterPoint(elementRectSC);

  // Try to center clipped region.
  const screenshotLeftVisibleEdge = clamp(
    elementRectCenter.x - elementPreviewSizeSC.width / 2,
    0,
    screenshotSize.width - elementPreviewSizeSC.width,
  );
  const screenshotTopVisibleEdge = clamp(
    elementRectCenter.y - elementPreviewSizeSC.height / 2,
    0,
    screenshotSize.height - elementPreviewSizeSC.height,
  );

  return {
    screenshot: {
      left: screenshotLeftVisibleEdge,
      top: screenshotTopVisibleEdge,
    },
    clip: {
      left: elementRectSC.left - screenshotLeftVisibleEdge,
      top: elementRectSC.top - screenshotTopVisibleEdge,
    },
  };
}

/**
 * Compute zoom factor based on element rect and container size
 * @param elementRectSC - Element rect in screenshot coordinates
 * @param renderContainerSizeDC - Container size in display coordinates
 * @return The zoom factor
 */
export function computeZoomFactor(elementRectSC: Rect, renderContainerSizeDC: Size): number {
  const targetClipToViewportRatio = 0.75;
  const zoomRatioXY = {
    x: renderContainerSizeDC.width / elementRectSC.width,
    y: renderContainerSizeDC.height / elementRectSC.height,
  };
  const zoomFactor = targetClipToViewportRatio * Math.min(zoomRatioXY.x, zoomRatioXY.y);
  return Math.min(1, zoomFactor);
}
