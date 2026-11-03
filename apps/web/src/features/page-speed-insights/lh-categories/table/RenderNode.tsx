/* eslint-disable @next/next/no-img-element */
"use client";
import { useState } from "react";
import { useFullPageScreenshots } from "@/features/page-speed-insights/PageSpeedContext";
import { RenderJSONDetails } from "@/features/page-speed-insights/RenderJSONDetails";
import type { NodeValue } from "@/lib/schema";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ElementScreenshotRenderer } from "@/features/page-speed-insights/lh-categories/table/ElementScreenshotRenderer";

/**
 * React component that renders a node element similar to the renderNode function
 * in the Lighthouse details-renderer.js
 */
export function NodeComponent({ item, device }: { item: NodeValue; device: string }) {
  // Validate item is an object
  if (!item || typeof item !== "object") {
    return null;
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="grid gap-2 md:grid-cols-[auto_auto]">
        <RenderNodeImage item={item} device={device} />
        <div className="flex flex-col gap-2 md:self-baseline">
          {item.nodeLabel ? <div>{item.nodeLabel}</div> : null}
          {item.snippet && (
            <div className="whitespace-pre-wrap font-mono text-sm leading-5 text-sky-400">
              {item.snippet}
            </div>
          )}
        </div>
      </div>
      <RenderJSONDetails
        data={item}
        title={`Node Data for ${item.lhId || "unknown"} on ${device}`}
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
  const screenshotData = useFullPageScreenshots();
  const [imageError, setImageError] = useState(false);

  // Validate item is an object
  if (!item || typeof item !== "object") {
    return null;
  }

  // Try to find the screenshot by matching device label
  // Device might be "Mobile", "Desktop", or a full label like "Mobile Report"
  let fullPageScreenshot = screenshotData?.[device];

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
    }
  }

  // If still not found, try to get the first available screenshot
  if (!fullPageScreenshot && screenshotData) {
    const firstKey = Object.keys(screenshotData)[0];
    fullPageScreenshot = screenshotData[firstKey];
  }

  // Check if we have the required data
  if (!fullPageScreenshot) {
    // No screenshot data available - return null to hide image
    return null;
  }

  if (!item?.lhId) {
    // No lhId in item - can't render node-specific screenshot
    return null;
  }

  // Check if screenshot data exists
  if (!fullPageScreenshot.screenshot || !fullPageScreenshot.screenshot.data) {
    // Screenshot data is missing
    return null;
  }

  // Get the node rect from the fullPageScreenshot
  let nodeRect = fullPageScreenshot.nodes?.[item.lhId];

  // If node rect doesn't exist in screenshot data, try to use boundingRect from item as fallback
  if ((!nodeRect || nodeRect.width === 0 || nodeRect.height === 0) && item.boundingRect) {
    nodeRect = item.boundingRect;
  }

  // If node rect still doesn't exist or has invalid dimensions, show full screenshot as fallback
  if (!nodeRect || nodeRect.width === 0 || nodeRect.height === 0) {
    // Fallback: show full screenshot thumbnail if node rect is missing
    const screenshot = fullPageScreenshot.screenshot;
    const aspectRatio = screenshot.width / screenshot.height;
    const displayHeight = Math.min(imageSize, screenshot.height);
    const displayWidth = displayHeight * aspectRatio;

    if (imageError || !screenshot.data) {
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

    return (
      <Dialog>
        <DialogTrigger>
          <div className="flex cursor-pointer items-center justify-center overflow-hidden rounded border border-border transition-transform hover:scale-110 hover:shadow-md">
            <img
              src={screenshot.data}
              alt="Screenshot"
              loading="lazy"
              decoding="async"
              onError={() => setImageError(true)}
              style={{
                width: `${displayWidth}px`,
                height: `${displayHeight}px`,
                objectFit: "contain",
              }}
            />
          </div>
        </DialogTrigger>
        <DialogContent className="h-full w-screen max-w-none justify-center md:w-[74vw]">
          <DialogTitle>Screenshot</DialogTitle>
          <div className="flex items-center justify-center">
            {imageError ? (
              <div className="flex items-center justify-center p-8 text-muted-foreground">
                <span>Image unavailable</span>
              </div>
            ) : (
              <img
                src={screenshot.data}
                alt="Full screenshot"
                onError={() => setImageError(true)}
                style={{
                  maxWidth: "100%",
                  height: "auto",
                }}
              />
            )}
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
