/* eslint-disable @next/next/no-img-element */
"use client";
import { memo, useContext, useEffect, useRef, useState } from 'react';
import { fullPageScreenshotContext } from '@/components/page-speed/PageSpeedContext';
import { RenderJSONDetails } from '@/components/page-speed/RenderJSONDetails';
import { NodeValue, FullPageScreenshot, Rect } from '@/lib/schema';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

/**
 * React component that renders a node element similar to the renderNode function
 * in the Lighthouse details-renderer.js
 */
export function NodeComponent({
  item,
  device,
}: {
  item: NodeValue;
  device: string;
}) {
  
    console.debug('[NodeComponent] Received device:', {
      device,
      deviceType: typeof device,
      hasDevice: !!device,
      lhId: item?.lhId,
      nodeLabel: item?.nodeLabel,
    });
  
  return (
    <div className="flex flex-col gap-2">
      <div className="grid gap-2 md:grid-cols-[auto_auto]">
        <RenderNodeImage item={item} device={device} />
        <div className="flex flex-col gap-2 md:self-baseline">
          {item.nodeLabel ? <div>{item.nodeLabel}</div> : null}
          {item.snippet && (
            <div className="whitespace-pre-wrap font-mono text-sm leading-5 text-blue-500">
              {item.snippet}
            </div>
          )}
        </div>
      </div>
      <RenderJSONDetails
        data={item}
        title={`Node Data for ${item.lhId} on ${device}`}
      />
    </div>
  );
}

export function RenderNodeImage({
  item,
  device,
  imageSize = 150,
}: {
  item: NodeValue;
  device: string;
  imageSize?: number;
}) {
  const screenshotData = useContext(fullPageScreenshotContext);
  
  // Validate device prop and log available options
    const availableKeys = Object.keys(screenshotData || {});
    console.debug('[RenderNodeImage] Device validation:', {
      receivedDevice: device,
      deviceType: typeof device,
      deviceLength: device?.length,
      availableScreenshotKeys: availableKeys,
      hasScreenshotData: !!screenshotData,
      screenshotDataKeys: screenshotData ? Object.keys(screenshotData) : [],
      directMatch: device ? !!screenshotData?.[device] : false,
    });
  
  // Try to find the screenshot by matching device label
  // Device might be "Mobile", "Desktop", or a full label like "Mobile Report"
  let fullPageScreenshot = screenshotData?.[device];
  let matchedDeviceKey = device;
  
  // If not found, try to find by partial match
  if (!fullPageScreenshot && device) {
    const deviceKey = Object.keys(screenshotData || {}).find((key) => {
      // Check if device is contained in key or vice versa
      const normalizedDevice = device.toLowerCase().trim();
      const normalizedKey = key.toLowerCase().trim();
      // Also try matching just the first word (e.g., "Mobile" from "Mobile Report")
      const deviceFirstWord = normalizedDevice.split(/\s+/)[0];
      const keyFirstWord = normalizedKey.split(/\s+/)[0];
      return (
        normalizedKey.includes(normalizedDevice) ||
        normalizedDevice.includes(normalizedKey) ||
        deviceFirstWord === keyFirstWord
      );
    });
    if (deviceKey) {
      fullPageScreenshot = screenshotData?.[deviceKey];
      matchedDeviceKey = deviceKey;
      
        console.debug('[RenderNodeImage] Found partial match:', {
          originalDevice: device,
          matchedKey: deviceKey,
        });
        
    } else {
      console.debug('[RenderNodeImage] No partial match found:', {
        device,
        availableKeys: Object.keys(screenshotData || {}),
      });
    }
  }
  
  // If still not found, try to get the first available screenshot
  if (!fullPageScreenshot && screenshotData) {
    const firstKey = Object.keys(screenshotData)[0];
    fullPageScreenshot = screenshotData[firstKey];
    matchedDeviceKey = firstKey;
    console.debug('[RenderNodeImage] Using first available screenshot as fallback:', {
      originalDevice: device,
      fallbackKey: firstKey,
    });
  }

  // Check if we have the required data
  if (!fullPageScreenshot || !item?.lhId) {
    console.debug('[RenderNodeImage] Missing data:', {
      hasScreenshot: !!fullPageScreenshot,
      hasLhId: !!item?.lhId,
      device,
      matchedDeviceKey,
      availableKeys: Object.keys(screenshotData || {}),
    });
    return null;
  }

  // Check if screenshot data exists
  if (!fullPageScreenshot.screenshot || !fullPageScreenshot.screenshot.data) {
    console.debug('[RenderNodeImage] Missing screenshot data:', {
      hasScreenshot: !!fullPageScreenshot.screenshot,
      hasData: !!fullPageScreenshot.screenshot?.data,
    });
    return null;
  }

  // Get the node rect from the fullPageScreenshot
  let nodeRect = fullPageScreenshot.nodes?.[item.lhId];
  
  // If node rect doesn't exist in screenshot data, try to use boundingRect from item as fallback
  if ((!nodeRect || nodeRect.width === 0 || nodeRect.height === 0) && item.boundingRect) {
    console.debug('[RenderNodeImage] Using boundingRect from item as fallback:', {
      hasNodeRect: !!nodeRect,
      hasBoundingRect: !!item.boundingRect,
      lhId: item.lhId,
    });
    nodeRect = item.boundingRect;
  }
  
  // If node rect still doesn't exist or has invalid dimensions, show full screenshot as fallback
  if (!nodeRect || nodeRect.width === 0 || nodeRect.height === 0) {
    console.debug('[RenderNodeImage] Node rect missing or invalid, showing full screenshot fallback:', {
      hasNodeRect: !!nodeRect,
      nodeRectWidth: nodeRect?.width,
      nodeRectHeight: nodeRect?.height,
      hasBoundingRect: !!item.boundingRect,
      lhId: item.lhId,
      availableNodeIds: Object.keys(fullPageScreenshot.nodes || {}),
    });
    // Fallback: show full screenshot thumbnail if node rect is missing
    const screenshot = fullPageScreenshot.screenshot;
    const aspectRatio = screenshot.width / screenshot.height;
    const displayHeight = Math.min(imageSize, screenshot.height);
    const displayWidth = displayHeight * aspectRatio;
    
    return (
      <Dialog>
        <DialogTrigger>
          <div className="flex cursor-pointer items-center justify-center overflow-hidden rounded border border-gray-300 transition-transform hover:scale-110 hover:shadow-md">
            <img
              src={screenshot.data}
              alt="Screenshot"
              style={{
                width: `${displayWidth}px`,
                height: `${displayHeight}px`,
                objectFit: 'contain',
              }}
            />
          </div>
        </DialogTrigger>
        <DialogContent className="h-full w-screen max-w-none justify-center md:w-[74vw]">
          <DialogTitle>Screenshot</DialogTitle>
          <div className="flex items-center justify-center">
            <img
              src={screenshot.data}
              alt="Full screenshot"
              style={{
                maxWidth: '100%',
                height: 'auto',
              }}
            />
          </div>
          <DialogClose asChild>
            <Button className="w-17" autoFocus>
              close
            </Button>
          </DialogClose>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <ElementScreenshotRenderer
      screenshot={fullPageScreenshot.screenshot}
      elementRects={[nodeRect]}
      maxThumbnailSize={{ width: imageSize, height: imageSize }}
    />
  );
}

/**
 * Size type definition
 */
interface Size {
  /** Width in pixels */
  width: number;
  /** Height in pixels */
  height: number;
}

/**
 * Position type definition
 */
interface Position {
  /** Left position in pixels */
  left: number;
  /** Top position in pixels */
  top: number;
}

/**
 * Screenshot positions type definition
 */
interface ScreenshotPositions {
  /** Screenshot position */
  screenshot: Position;
  /** Clip position */
  clip: Position;
}

/**
 * ElementScreenshotRenderer props
 */
interface ElementScreenshotRendererProps {
  /** Screenshot object with data, width, and height */
  screenshot: FullPageScreenshot['screenshot'];
  /** Array of element rectangles */
  elementRects?: Rect[];
  /** Maximum thumbnail size */
  maxThumbnailSize?: Size;
}

/**
 * ElementScreenshot props
 */
interface ElementScreenshotProps {
  /** Screenshot object with data, width, and height */
  screenshot: FullPageScreenshot['screenshot'];
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
 * Helper function to check if screenshot overlaps with the element rect
 * @param screenshot - The screenshot object with width and height
 * @param rect - The element rect with left, right, top, bottom
 * @return Whether the screenshot overlaps with the rect
 */
function screenshotOverlapsRect(
  screenshot: FullPageScreenshot['screenshot'],
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
function getUniqueId(): string {
  return `clip-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Calculate screenshot positions based on element rect and preview size
 * @param elementRectSC - Element rect in screenshot coordinates
 * @param elementPreviewSizeSC - Preview size in screenshot coordinates
 * @param screenshotSize - Screenshot size
 * @return The screenshot positions
 */
function getScreenshotPositions(
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
function computeZoomFactor(
  elementRectSC: Rect,
  renderContainerSizeDC: Size,
): number {
  const targetClipToViewportRatio = 0.75;
  const zoomRatioXY = {
    x: renderContainerSizeDC.width / elementRectSC.width,
    y: renderContainerSizeDC.height / elementRectSC.height,
  };
  const zoomFactor =
    targetClipToViewportRatio * Math.min(zoomRatioXY.x, zoomRatioXY.y);
  return Math.min(1, zoomFactor);
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
 */
function ElementScreenshot({
  screenshot,
  elementRect,
  maxRenderSize,
}: ElementScreenshotProps): React.ReactElement | null {
  const containerRef = useRef<HTMLDivElement>(null);
  const clipId = getUniqueId();

  if (!screenshotOverlapsRect(screenshot, elementRect)) {
    return null;
  }

  // Compute zoom factor
  const zoomFactor = computeZoomFactor(elementRect, maxRenderSize);

  // Calculate preview size in screenshot coordinates
  const elementPreviewSizeSC: Size = {
    width: maxRenderSize.width / zoomFactor,
    height: maxRenderSize.height / zoomFactor,
  };

  elementPreviewSizeSC.width = Math.min(
    screenshot.width,
    elementPreviewSizeSC.width,
  );
  elementPreviewSizeSC.height = Math.min(
    screenshot.height,
    elementPreviewSizeSC.height,
  );

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

  // Styles for the image element
  const imageStyle: React.CSSProperties = {
    width: `${elementPreviewSizeDC.width}px`,
    height: `${elementPreviewSizeDC.height}px`,
    backgroundImage: `url(${screenshot.data})`,
    backgroundPositionY: `${-(positions.screenshot.top * zoomFactor)}px`,
    backgroundPositionX: `${-(positions.screenshot.left * zoomFactor)}px`,
    backgroundSize: `${screenshot.width * zoomFactor}px ${screenshot.height * zoomFactor}px`,
  };

  // Styles for the marker element
  const markerStyle: React.CSSProperties = {
    width: `${elementRect.width * zoomFactor}px`,
    height: `${elementRect.height * zoomFactor}px`,
    left: `${positions.clip.left * zoomFactor}px`,
    top: `${positions.clip.top * zoomFactor}px`,
  };

  // Styles for the mask element
  const maskStyle: React.CSSProperties = {
    width: `${elementPreviewSizeDC.width}px`,
    height: `${elementPreviewSizeDC.height}px`,
    clipPath: `url(#${clipId})`,
  };

  return (
    <div
      className="relative overflow-hidden"
      ref={containerRef}
      data-rect-width={elementRect.width}
      data-rect-height={elementRect.height}
      data-rect-left={elementRect.left}
      data-rect-top={elementRect.top}
    >
      <div className="relative">
        <div className="relative bg-no-repeat" style={imageStyle}>
          <div className="absolute inset-0 bg-black/50" style={maskStyle}>
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
          <div
            className="pointer-events-none absolute border-2 border-orange-500 shadow-[0_0_0_2px_rgba(255,255,255,0.8)]"
            style={markerStyle}
          ></div>
        </div>
      </div>
    </div>
  );
}

const RenderThumbnails = memo(function RThumbnails({
  screenshot,
  elementRects = [],
  maxThumbnailSize = { width: 120, height: 80 },
}: ElementScreenshotRendererProps) {
  const aspectRatio = screenshot.width / screenshot.height;
  const displayHeight = Math.min(maxThumbnailSize.height, screenshot.height);
  const displayWidth = displayHeight * aspectRatio;
  
  const thumbnails = elementRects.map((rect, index) => {
    // Check if the rect overlaps with the screenshot before trying to render
    if (!screenshotOverlapsRect(screenshot, rect)) {
      // Show full screenshot as fallback when rect doesn't overlap
      return (
        <div
          key={index}
          className="overflow-hidden rounded border border-gray-300 transition-transform"
        >
          <img
            src={screenshot.data}
            alt="Screenshot"
            style={{
              width: `${displayWidth}px`,
              height: `${displayHeight}px`,
              objectFit: 'contain',
            }}
          />
        </div>
      );
    }
    
    return (
      <div
        key={index}
        className="overflow-hidden rounded border border-gray-300 transition-transform"
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
    return (
      <div className="overflow-hidden rounded border border-gray-300 transition-transform">
        <img
          src={screenshot.data}
          alt="Screenshot"
          style={{
            width: `${displayWidth}px`,
            height: `${displayHeight}px`,
            objectFit: 'contain',
          }}
        />
      </div>
    );
  }
  
  return <>{thumbnails}</>;
});

/**
 * ElementScreenshotRenderer component without overlay functionality
 */
function ElementScreenshotRenderer({
  screenshot,
  elementRects = [],
  maxThumbnailSize = { width: 120, height: 80 },
}: ElementScreenshotRendererProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [isClient, setIsClient] = useState(false);
  useEffect(() => {
    setIsClient(true);
  }, []);
  if (!screenshot) return null;
  return (
    <Dialog>
      <DialogTrigger>
        <div className="flex cursor-pointer flex-wrap place-content-center gap-2.5 hover:scale-110 hover:shadow-md">
        {isClient ? <RenderThumbnails
            maxThumbnailSize={maxThumbnailSize}
            elementRects={elementRects}
            screenshot={screenshot}
          /> : null}
        </div>
      </DialogTrigger>
      <DialogContent
        ref={ref}
        className="h-full w-screen max-w-none justify-center md:w-[74vw]"
      >
        <DialogTitle>screenshot</DialogTitle>
        {isClient ? <RenderThumbnails
          maxThumbnailSize={{
            width: ref.current?.clientWidth || 500,
            height: ref.current?.clientHeight || 500,
          }}
          screenshot={screenshot}
          elementRects={elementRects}
        /> : null}

        <DialogClose asChild>
          <Button className="w-17" autoFocus>
            close
          </Button>
        </DialogClose>
      </DialogContent>
    </Dialog>
  );
}
