"use client";
import { useState, useSyncExternalStore } from "react";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  RenderThumbnails,
  type ElementScreenshotRendererProps,
} from "@/features/page-speed-insights/lh-categories/table/ElementScreenshotThumbnails";

const subscribeNoop = () => () => {};

/**
 * ElementScreenshotRenderer component without overlay functionality
 */
export function ElementScreenshotRenderer({
  screenshot,
  elementRects = [],
  maxThumbnailSize = { width: 120, height: 80 },
}: ElementScreenshotRendererProps) {
  const [dialogEl, setDialogEl] = useState<HTMLDivElement | null>(null);
  const isClient = useSyncExternalStore(
    subscribeNoop,
    () => true,
    () => false,
  );
  if (!screenshot) return null;
  return (
    <Dialog>
      <DialogTrigger asChild>
        <div className="flex cursor-pointer items-center justify-center hover:scale-110 hover:shadow-md">
          {isClient ? (
            <RenderThumbnails
              maxThumbnailSize={maxThumbnailSize}
              elementRects={elementRects}
              screenshot={screenshot}
            />
          ) : null}
        </div>
      </DialogTrigger>
      <DialogContent
        ref={setDialogEl}
        className="h-full w-screen max-w-none justify-center md:w-[74vw]"
      >
        <DialogTitle>screenshot</DialogTitle>
        {isClient ? (
          <RenderThumbnails
            maxThumbnailSize={{
              width: dialogEl?.clientWidth || 500,
              height: dialogEl?.clientHeight || 500,
            }}
            screenshot={screenshot}
            elementRects={elementRects}
          />
        ) : null}

        <DialogClose asChild>
          <Button className="w-17" autoFocus>
            close
          </Button>
        </DialogClose>
      </DialogContent>
    </Dialog>
  );
}
