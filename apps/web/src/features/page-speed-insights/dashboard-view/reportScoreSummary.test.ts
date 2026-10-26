import { describe, expect, it } from "vitest";
import type { InsightsContextItem } from "@/lib/page-speed-insights/types";
import { summarizeReport } from "@/features/page-speed-insights/dashboard-view/reportScoreSummary";

function asItem(value: unknown): InsightsContextItem {
  return value as InsightsContextItem;
}

describe("summarizeReport", () => {
  it("includes metric scores and performance auditRef weights", () => {
    const summary = summarizeReport(
      asItem({
        label: "A · Mobile",
        item: {
          lighthouseResult: {
            categories: {
              performance: {
                id: "performance",
                title: "Performance",
                score: 0.98,
                auditRefs: [
                  { id: "first-contentful-paint", weight: 10 },
                  { id: "largest-contentful-paint", weight: 25 },
                  { id: "total-blocking-time", weight: 30 },
                  { id: "cumulative-layout-shift", weight: 25 },
                  { id: "speed-index", weight: 10 },
                ],
              },
              accessibility: { id: "accessibility", title: "Accessibility", score: 0.93 },
            },
            audits: {
              "first-contentful-paint": {
                id: "first-contentful-paint",
                title: "First Contentful Paint",
                displayValue: "1.7 s",
                score: 0.98,
              },
              "largest-contentful-paint": {
                id: "largest-contentful-paint",
                title: "Largest Contentful Paint",
                displayValue: "2.1 s",
                score: 0.95,
              },
              "total-blocking-time": {
                id: "total-blocking-time",
                title: "Total Blocking Time",
                displayValue: "50 ms",
                score: 1,
              },
              "cumulative-layout-shift": {
                id: "cumulative-layout-shift",
                title: "Cumulative Layout Shift",
                displayValue: "0",
                score: 1,
              },
              "speed-index": {
                id: "speed-index",
                title: "Speed Index",
                displayValue: "1.7 s",
                score: 0.99,
              },
            },
          },
        },
      }),
    );

    expect(summary.performance).toEqual({
      id: "performance",
      title: "Performance",
      score: 0.98,
    });
    expect(summary.metrics).toEqual([
      {
        id: "first-contentful-paint",
        acronym: "FCP",
        title: "First Contentful Paint",
        displayValue: "1.7 s",
        score: 0.98,
        weight: 10,
      },
      {
        id: "largest-contentful-paint",
        acronym: "LCP",
        title: "Largest Contentful Paint",
        displayValue: "2.1 s",
        score: 0.95,
        weight: 25,
      },
      {
        id: "total-blocking-time",
        acronym: "TBT",
        title: "Total Blocking Time",
        displayValue: "50 ms",
        score: 1,
        weight: 30,
      },
      {
        id: "cumulative-layout-shift",
        acronym: "CLS",
        title: "Cumulative Layout Shift",
        displayValue: "0",
        score: 1,
        weight: 25,
      },
      {
        id: "speed-index",
        acronym: "SI",
        title: "Speed Index",
        displayValue: "1.7 s",
        score: 0.99,
        weight: 10,
      },
    ]);
  });

  it("sets weight null when auditRef is missing", () => {
    const summary = summarizeReport(
      asItem({
        label: "A · Mobile",
        item: {
          lighthouseResult: {
            categories: {
              performance: {
                id: "performance",
                title: "Performance",
                score: 0.9,
                auditRefs: [{ id: "first-contentful-paint", weight: 10 }],
              },
            },
            audits: {
              "first-contentful-paint": {
                id: "first-contentful-paint",
                title: "First Contentful Paint",
                displayValue: "1.7 s",
                score: 0.98,
              },
              "largest-contentful-paint": {
                id: "largest-contentful-paint",
                title: "Largest Contentful Paint",
                displayValue: "2.1 s",
                score: 0.95,
              },
            },
          },
        },
      }),
    );

    expect(summary.metrics).toEqual([
      expect.objectContaining({ id: "first-contentful-paint", weight: 10 }),
      expect.objectContaining({ id: "largest-contentful-paint", weight: null }),
    ]);
  });
});
