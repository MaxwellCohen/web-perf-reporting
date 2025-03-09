import { FullPageScreenshot } from "@/lib/schema";
import { createContext } from "react";



export const fullPageScreenshotContext = createContext<{
    desktopFullPageScreenshot: FullPageScreenshot | null;
    mobileFullPageScreenshot: FullPageScreenshot | null;
  }>({
    desktopFullPageScreenshot: null,
    mobileFullPageScreenshot: null,
  });