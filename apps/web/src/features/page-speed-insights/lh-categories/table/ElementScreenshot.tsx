/* eslint-disable @next/next/no-img-element */
"use client";
import { useRef, useState } from "react";
import type { FullPageScreenshot, Rect } from "@/lib/schema";
import {
  computeZoomFactor,
  getScreenshotPositions,
  getUniqueId,
  screenshotOverlapsRect,
  type Position,
  type Size,
} from "@/features/page-speed-insights/lh-categories/table/elementScreenshotGeometry";

/**
 * ElementScreenshot props
 */
export interface ElementScreenshotProps {
  /** Screenshot object with data, width, and height */
  screenshot: FullPageScreenshot["screenshot"];
  /** Element rectangle */
  elementRect: Rect;
  /** Maximum render size */
  maxRenderSize: Size;
}

/**
 * ClipPath props
 */
interface ClipPathProps {
  /** Position of the clip */
  positionClip: Position;
  /** Element rectangle */
  elementRect: Rect;
  /** Element preview size */
  elementPreviewSize: Size;
  /** Clip path ID */
  clipId: string;
}

/**
 * ClipPath component for the screenshot mask
 */
function ClipPath({
  positionClip,
  elementRect,
  elementPreviewSize,
  clipId,
}: ClipPathProps): React.ReactElement {
  // Normalize values between 0-1.
  const top = positionClip.top / elementPreviewSize.height;
  const bottom = top + elementRect.height / elementPreviewSize.height;
  const left = positionClip.left / elementPreviewSize.width;
  const right = left + elementRect.width / elementPreviewSize.width;

  const polygonsPoints = [
    `0,0             1,0            1,${top}          0,${top}`,
    `0,${bottom}     1,${bottom}    1,1               0,1`,
    `0,${top}        ${left},${top} ${left},${bottom} 0,${bottom}`,
    `${right},${top} 1,${top}       1,${bottom}       ${right},${bottom}`,
  ];

  return (
    <clipPath id={clipId} clipPathUnits="objectBoundingBox">
      {polygonsPoints.map((points, index) => (
        <polygon key={index} points={points} />
      ))}
    </clipPath>
  );
}

/**
 * ElementScreenshot component for rendering a screenshot with highlighted element
 * Matches the structure from Lighthouse's element-screenshot-renderer.js
 */
export function ElementScreenshot({
  screenshot,
  elementRect,
  maxRenderSize,
}: ElementScreenshotProps): React.ReactElement | null {
  const containerRef = useRef<HTMLDivElement>(null);
  const clipId = getUniqueId();
  const [imageError, setImageError] = useState(false);

  if (!screenshotOverlapsRect(screenshot, elementRect)) {
    return null;
  }

  // Validate data URL format
  const isValidDataUrl =
    screenshot.data &&
    (screenshot.data.startsWith("data:image/") ||
      screenshot.data.startsWith("http://") ||
      screenshot.data.startsWith("https://"));

  // If image data is invalid or error occurred, show fallback
  if (imageError || !screenshot.data || !isValidDataUrl) {
    const displayWidth = Math.min(maxRenderSize.width, 150);
    const displayHeight = Math.min(maxRenderSize.height, 150);
    return (
      <div
        className="flex items-center justify-center overflow-hidden rounded border border-border bg-muted"
        style={{
          width: `${displayWidth}px`,
          height: `${displayHeight}px`,
        }}
      >
        <span className="text-xs text-muted-foreground">Image unavailable</span>
      </div>
    );
  }

  // Compute zoom factor
  const zoomFactor = computeZoomFactor(elementRect, maxRenderSize);

  // Calculate preview size in screenshot coordinates
  const elementPreviewSizeSC: Size = {
    width: maxRenderSize.width / zoomFactor,
    height: maxRenderSize.height / zoomFactor,
  };

  elementPreviewSizeSC.width = Math.min(screenshot.width, elementPreviewSizeSC.width);
  elementPreviewSizeSC.height = Math.min(screenshot.height, elementPreviewSizeSC.height);

  // Calculate preview size in display coordinates
  const elementPreviewSizeDC: Size = {
    width: elementPreviewSizeSC.width * zoomFactor,
    height: elementPreviewSizeSC.height * zoomFactor,
  };

  // Get positions for screenshot and clip
  const positions = getScreenshotPositions(elementRect, elementPreviewSizeSC, {
    width: screenshot.width,
    height: screenshot.height,
  });

  // Styles for the image element (matches Lighthouse's lh-element-screenshot__image)
  const imageStyle: React.CSSProperties = {
    position: "relative",
    width: `${elementPreviewSizeDC.width}px`,
    height: `${elementPreviewSizeDC.height}px`,
    backgroundImage: `url('${screenshot.data}')`,
    backgroundPosition: `${-(positions.screenshot.left * zoomFactor)}px ${-(positions.screenshot.top * zoomFactor)}px`,
    backgroundSize: `${screenshot.width * zoomFactor}px ${screenshot.height * zoomFactor}px`,
    backgroundRepeat: "no-repeat",
    outline: "2px solid #777",
    backgroundColor: "white",
  };

  // Styles for the marker element (matches Lighthouse's lh-element-screenshot__element-marker)
  const markerStyle: React.CSSProperties = {
    position: "absolute",
    width: `${elementRect.width * zoomFactor}px`,
    height: `${elementRect.height * zoomFactor}px`,
    left: `${positions.clip.left * zoomFactor}px`,
    top: `${positions.clip.top * zoomFactor}px`,
    outline: "2px solid #84cc16", // var(--color-lime-400)
  };

  // Styles for the mask element (matches Lighthouse's lh-element-screenshot__mask)
  const maskStyle: React.CSSProperties = {
    position: "absolute",
    width: `${elementPreviewSizeDC.width}px`,
    height: `${elementPreviewSizeDC.height}px`,
    background: "#555",
    opacity: 0.8,
    clipPath: `url(#${clipId})`,
  };

  // Styles for the content wrapper (matches Lighthouse's lh-element-screenshot__content)
  const contentStyle: React.CSSProperties = {
    overflow: "hidden",
    minWidth: "110px",
    display: "flex",
    justifyContent: "center",
    backgroundColor: "var(--report-background-color, #fff)",
  };

  return (
    <div
      className="lh-element-screenshot"
      ref={containerRef}
      data-rect-width={elementRect.width}
      data-rect-height={elementRect.height}
      data-rect-left={elementRect.left}
      data-rect-top={elementRect.top}
      style={{ float: "left", marginRight: "20px" }}
    >
      {/* Hidden img to detect load errors for background-image */}
      <img
        src={screenshot.data}
        alt=""
        onError={() => setImageError(true)}
        style={{ display: "none" }}
        aria-hidden="true"
      />
      <div className="lh-element-screenshot__content" style={contentStyle}>
        <div className="lh-element-screenshot__image" style={imageStyle}>
          <div className="lh-element-screenshot__mask" style={maskStyle}>
            <svg height="0" width="0">
              <defs>
                <ClipPath
                  clipId={clipId}
                  positionClip={positions.clip}
                  elementRect={elementRect}
                  elementPreviewSize={elementPreviewSizeSC}
                />
              </defs>
            </svg>
          </div>
          <div className="lh-element-screenshot__element-marker" style={markerStyle}></div>
        </div>
      </div>
    </div>
  );
}
