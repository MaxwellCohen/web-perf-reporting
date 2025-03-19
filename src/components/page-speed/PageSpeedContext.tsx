import { FullPageScreenshot } from "@/lib/schema";
import { createContext } from "react";



export const fullPageScreenshotContext = createContext<{
    desktopFullPageScreenshot?: FullPageScreenshot;
    mobileFullPageScreenshot?: FullPageScreenshot;
  }>({
    desktopFullPageScreenshot: undefined,
    mobileFullPageScreenshot: undefined,
  });