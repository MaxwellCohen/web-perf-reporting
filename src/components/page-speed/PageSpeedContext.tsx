'use client'
import { FullPageScreenshot, PageSpeedInsights } from "@/lib/schema";
import { createContext } from "react";



export const fullPageScreenshotContext = createContext<Record<string, FullPageScreenshot | undefined | null>>({});

export type InsightsContextItem = {
    item: PageSpeedInsights,
    label: string
}

export const InsightsContext = createContext<InsightsContextItem[]>([]);