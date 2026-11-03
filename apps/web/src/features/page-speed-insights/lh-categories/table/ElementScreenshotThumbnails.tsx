/* eslint-disable @next/next/no-img-element */
"use client";
import { memo, useState } from "react";
import type { FullPageScreenshot, Rect } from "@/lib/schema";
import { ElementScreenshot } from "@/features/page-speed-insights/lh-categories/table/ElementScreenshot";
import {
  screenshotOverlapsRect,
  type Size,
} from "@/features/page-speed-insights/lh-categories/table/elementScreenshotGeometry";

/**
 * ElementScreenshotRenderer props
 */
export interface ElementScreenshotRendererProps {
  /** Screenshot object with data, width, and height */
  screenshot: FullPageScreenshot["screenshot"];
  /** Array of element rectangles */
  elementRects?: Rect[];
  /** Maximum thumbnail size */
  maxThumbnailSize?: Size;
}

function ThumbnailUnavailableFallback({
  displayWidth,
  displayHeight,
}: {
  displayWidth: number;
  displayHeight: number;
}) {
  return (
    <div
      className="flex items-center justify-center overflow-hidden rounded border border-border bg-muted transition-transform"
      style={{
        width: `${displayWidth}px`,
        height: `${displayHeight}px`,
      }}
    >
      <span className="text-xs text-muted-foreground">Image unavailable</span>
    </div>
  );
}

function FullScreenshotThumbnail({
  dataUrl,
  displayWidth,
  displayHeight,
  onImageError,
}: {
  dataUrl: string;
  displayWidth: number;
  displayHeight: number;
  onImageError: () => void;
}) {
  return (
    <div
      className="flex items-center justify-center overflow-hidden rounded border border-border transition-transform"
      style={{
        width: `${displayWidth}px`,
        height: `${displayHeight}px`,
        minWidth: `${displayWidth}px`,
        minHeight: `${displayHeight}px`,
      }}
    >
      <img
        src={dataUrl}
        alt="Screenshot"
        onError={onImageError}
        style={{
          width: "100%",
          height: "100%",
          objectFit: "contain",
        }}
      />
    </div>
  );
}

export const RenderThumbnails = memo(function RThumbnails({
  screenshot,
  elementRects = [],
  maxThumbnailSize = { width: 120, height: 80 },
}: ElementScreenshotRendererProps) {
  const [imageError, setImageError] = useState(false);
  const aspectRatio = screenshot.width / screenshot.height;
  const displayHeight = Math.min(maxThumbnailSize.height, screenshot.height);
  const displayWidth = displayHeight * aspectRatio;

  const thumbnails = elementRects.map((rect, index) => {
    // Check if the rect overlaps with the screenshot before trying to render
    if (!screenshotOverlapsRect(screenshot, rect)) {
      // Show full screenshot as fallback when rect doesn't overlap
      if (imageError || !screenshot.data) {
        return (
          <ThumbnailUnavailableFallback
            key={index}
            displayWidth={displayWidth}
            displayHeight={displayHeight}
          />
        );
      }
      return (
        <FullScreenshotThumbnail
          key={index}
          dataUrl={screenshot.data}
          displayWidth={displayWidth}
          displayHeight={displayHeight}
          onImageError={() => setImageError(true)}
        />
      );
    }

    return (
      <div
        key={index}
        className="flex items-center justify-center overflow-hidden rounded border border-border transition-transform"
        style={{
          minWidth: `${maxThumbnailSize.width}px`,
          minHeight: `${maxThumbnailSize.height}px`,
        }}
      >
        <ElementScreenshot
          screenshot={screenshot}
          elementRect={rect}
          maxRenderSize={maxThumbnailSize}
        />
      </div>
    );
  });

  // If no element rects provided, show at least the full screenshot
  if (elementRects.length === 0) {
    if (imageError || !screenshot.data) {
      return (
        <ThumbnailUnavailableFallback displayWidth={displayWidth} displayHeight={displayHeight} />
      );
    }
    return (
      <FullScreenshotThumbnail
        dataUrl={screenshot.data}
        displayWidth={displayWidth}
        displayHeight={displayHeight}
        onImageError={() => setImageError(true)}
      />
    );
  }

  return <>{thumbnails}</>;
});
