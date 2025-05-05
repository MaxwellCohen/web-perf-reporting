'use client'
import { FullPageScreenshot } from "@/lib/schema";
import { createContext } from "react";



export const fullPageScreenshotContext = createContext<Record<string, FullPageScreenshot | undefined | null>>({});