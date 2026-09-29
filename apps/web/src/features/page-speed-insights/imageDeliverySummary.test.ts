import { describe, expect, it } from "vitest";
import type { AuditResult } from "@/lib/schema";
import {
  imageSizeLines,
  summarizeImageDelivery,
  type ImageDeliveryReportSize,
} from "@/features/page-speed-insights/imageDeliverySummary";

function audit(items: unknown[]): AuditResult {
  return {
    id: "image-delivery-insight",
    title: "Improve image delivery",
    score: 0.5,
    scoreDisplayMode: "metricSavings",
    details: {
      type: "table",
      headings: [],
      items,
    },
  } as AuditResult;
}

describe("summarizeImageDelivery", () => {
  it("lists each image once with format and size changes", () => {
    const summary = summarizeImageDelivery([
      {
        label: "Mobile",
        audit: audit([
          {
            url: "https://images.example/a.jpg",
            totalBytes: 254535,
            wastedBytes: 244046,
            subItems: {
              type: "subitems",
              items: [
                {
                  reason:
                    "Using a modern image format (WebP, AVIF) or increasing the image compression could improve this image's download size.",
                  wastedBytes: 230467,
                },
                {
                  reason:
                    "This image file is larger than it needs to be (311x464) for its displayed dimensions (129x197). Use responsive images to reduce the image download size.",
                  wastedBytes: 209837,
                },
              ],
            },
          },
        ]),
      },
    ]);

    expect(summary.images).toHaveLength(1);
    expect(summary.images[0]).toMatchObject({
      url: "https://images.example/a.jpg",
      totalBytes: 254535,
      wastedBytes: 230467,
    });
    expect(summary.images[0].optimizations.map((optimization) => optimization.id)).toEqual([
      "modern-format",
      "responsive-size",
    ]);
    expect(summary.images[0].optimizations[0]).toMatchObject({
      title: "Use a modern format or compress more",
      wastedBytes: 230467,
    });
    expect(summary.images[0].optimizations[1].reports[0]).toMatchObject({
      label: "Mobile",
      fileWidth: 311,
      fileHeight: 464,
      displayWidth: 129,
      displayHeight: 197,
      wastedBytes: 209837,
    });
  });

  it("merges the same url across reports using the larger savings", () => {
    const reason = "Increasing the image compression could improve this image's download size.";
    const image = (totalBytes: number, wastedBytes: number) => ({
      url: "https://images.example/a.jpg",
      totalBytes,
      subItems: {
        type: "subitems",
        items: [{ reason, wastedBytes }],
      },
    });

    const summary = summarizeImageDelivery([
      { label: "Desktop", audit: audit([image(1200, 400)]) },
      { label: "Mobile", audit: audit([image(1000, 100)]) },
    ]);

    expect(summary.images).toHaveLength(1);
    expect(summary.images[0].wastedBytes).toBe(400);
    expect(summary.images[0].totalBytes).toBe(1200);
    expect(summary.images[0].optimizations).toHaveLength(1);
    expect(summary.images[0].optimizations[0].reports.map((report) => report.label)).toEqual([
      "Desktop",
      "Mobile",
    ]);
  });

  it("keeps an unrecognized reason on that image", () => {
    const summary = summarizeImageDelivery([
      {
        label: "Mobile",
        audit: audit([
          {
            url: "https://images.example/b.jpg",
            totalBytes: 500,
            subItems: {
              type: "subitems",
              items: [{ reason: "Use a CDN for this image.", wastedBytes: 50 }],
            },
          },
        ]),
      },
    ]);

    expect(summary.images[0].optimizations[0]).toMatchObject({
      id: "other:Use a CDN for this image.",
      title: "Use a CDN for this image.",
      wastedBytes: 50,
    });
  });

  it("collapses near-identical file sizes and keeps each displayed size", () => {
    const reports: ImageDeliveryReportSize[] = [
      {
        label: "Desktop",
        wastedBytes: 400,
        fileWidth: 311,
        fileHeight: 465,
        displayWidth: 203,
        displayHeight: 310,
      },
      {
        label: "Mobile",
        wastedBytes: 200,
        fileWidth: 311,
        fileHeight: 464,
        displayWidth: 129,
        displayHeight: 197,
      },
    ];

    expect(imageSizeLines(reports)).toEqual([
      "File 311×465",
      "Desktop shown at 203×310",
      "Mobile shown at 129×197",
    ]);
  });

  it("returns no images when the audit has no image rows", () => {
    expect(
      summarizeImageDelivery([
        {
          label: "Mobile",
          audit: {
            id: "image-delivery-insight",
            title: "Improve image delivery",
            score: 1,
            scoreDisplayMode: "metricSavings",
            details: { type: "debugdata", details: { items: [] } },
          } as AuditResult,
        },
      ]).images,
    ).toEqual([]);
  });
});
