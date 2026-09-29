import type { AuditResult } from "@/lib/schema";
import type { CauseAuditEntry } from "@/features/page-speed-insights/metricCauseAudits";

const RESPONSIVE_SIZE =
  /larger than it needs to be \((\d+)x(\d+)\) for its displayed dimensions \((\d+)x(\d+)\)/i;

export type ImageDeliveryOptimizationId = "modern-format" | "responsive-size";

export type ImageDeliveryReportSize = {
  label: string;
  wastedBytes: number;
  fileWidth?: number;
  fileHeight?: number;
  displayWidth?: number;
  displayHeight?: number;
};

export type ImageDeliveryOptimization = {
  id: string;
  title: string;
  description: string;
  wastedBytes: number;
  reports: ImageDeliveryReportSize[];
};

export type ImageDeliveryImage = {
  url: string;
  totalBytes: number;
  /** Largest single change. Format and size savings overlap and are not summed. */
  wastedBytes: number;
  optimizations: ImageDeliveryOptimization[];
};

export type ImageDeliverySummary = {
  images: ImageDeliveryImage[];
};

const KNOWN_OPTIMIZATIONS: Record<
  ImageDeliveryOptimizationId,
  { title: string; description: string }
> = {
  "modern-format": {
    title: "Use a modern format or compress more",
    description: "Convert these images to WebP or AVIF, or increase compression.",
  },
  "responsive-size": {
    title: "Serve images at the displayed size",
    description:
      "The downloaded file is larger than the size on screen. Use srcset or a resized image.",
  },
};

type PendingOptimization = {
  title: string;
  description: string;
  reports: Map<string, ImageDeliveryReportSize>;
};

type PendingImage = {
  url: string;
  totalBytes: number;
  optimizations: Map<string, PendingOptimization>;
};

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function asNumber(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function classifyReason(reason: string): {
  id: string;
  title: string;
  description: string;
  size?: Omit<ImageDeliveryReportSize, "label" | "wastedBytes">;
} {
  const responsive = reason.match(RESPONSIVE_SIZE);
  if (responsive || /responsive images|displayed dimensions/i.test(reason)) {
    const known = KNOWN_OPTIMIZATIONS["responsive-size"];
    return {
      id: "responsive-size",
      title: known.title,
      description: known.description,
      size: responsive
        ? {
            fileWidth: Number(responsive[1]),
            fileHeight: Number(responsive[2]),
            displayWidth: Number(responsive[3]),
            displayHeight: Number(responsive[4]),
          }
        : undefined,
    };
  }

  if (/modern image format|image compression/i.test(reason)) {
    const known = KNOWN_OPTIMIZATIONS["modern-format"];
    return { id: "modern-format", title: known.title, description: known.description };
  }

  return { id: `other:${reason}`, title: reason, description: "" };
}

function tableItems(audit: AuditResult): unknown[] {
  const details = asRecord(audit.details);
  if (!details) return [];
  const type = details.type;
  if (type !== "table" && type !== "opportunity") return [];
  return Array.isArray(details.items) ? details.items : [];
}

function subItems(item: Record<string, unknown>): Array<{ reason: string; wastedBytes: number }> {
  const sub = asRecord(item.subItems);
  if (!sub || !Array.isArray(sub.items)) return [];

  return sub.items.flatMap((entry) => {
    const record = asRecord(entry);
    if (!record || typeof record.reason !== "string" || !record.reason) return [];
    return [{ reason: record.reason, wastedBytes: asNumber(record.wastedBytes) }];
  });
}

function reportsFor(optimization: PendingOptimization): ImageDeliveryReportSize[] {
  return [...optimization.reports.values()].sort((a, b) => a.label.localeCompare(b.label));
}

function wastedBytesFor(reports: ImageDeliveryReportSize[]): number {
  return reports.reduce((max, report) => Math.max(max, report.wastedBytes), 0);
}

/**
 * List each image once, with every change it needs underneath.
 * Byte savings overlap when one image needs more than one change, so they are not summed.
 * The same URL is merged across reports, keeping the larger savings for each change.
 */
export function summarizeImageDelivery(
  entries: CauseAuditEntry["entries"],
): ImageDeliverySummary {
  const images = new Map<string, PendingImage>();

  for (const { audit, label } of entries) {
    for (const rawItem of tableItems(audit)) {
      const item = asRecord(rawItem);
      if (!item || typeof item.url !== "string" || !item.url) continue;

      const totalBytes = asNumber(item.totalBytes);
      const image = images.get(item.url) ?? {
        url: item.url,
        totalBytes,
        optimizations: new Map<string, PendingOptimization>(),
      };
      image.totalBytes = Math.max(image.totalBytes, totalBytes);

      for (const subItem of subItems(item)) {
        const classified = classifyReason(subItem.reason);
        const optimization = image.optimizations.get(classified.id) ?? {
          title: classified.title,
          description: classified.description,
          reports: new Map<string, ImageDeliveryReportSize>(),
        };
        const existing = optimization.reports.get(label);
        optimization.reports.set(label, {
          label,
          wastedBytes: Math.max(existing?.wastedBytes ?? 0, subItem.wastedBytes),
          fileWidth: classified.size?.fileWidth ?? existing?.fileWidth,
          fileHeight: classified.size?.fileHeight ?? existing?.fileHeight,
          displayWidth: classified.size?.displayWidth ?? existing?.displayWidth,
          displayHeight: classified.size?.displayHeight ?? existing?.displayHeight,
        });
        image.optimizations.set(classified.id, optimization);
      }

      images.set(item.url, image);
    }
  }

  const summarized = [...images.values()].map((image) => {
    const optimizations = [...image.optimizations.entries()]
      .map(([id, optimization]) => {
        const reports = reportsFor(optimization);
        return {
          id,
          title: optimization.title,
          description: optimization.description,
          wastedBytes: wastedBytesFor(reports),
          reports,
        };
      })
      .sort((a, b) => b.wastedBytes - a.wastedBytes || a.title.localeCompare(b.title));

    return {
      url: image.url,
      totalBytes: image.totalBytes,
      wastedBytes: optimizations.reduce((max, optimization) => Math.max(max, optimization.wastedBytes), 0),
      optimizations,
    };
  });

  summarized.sort((a, b) => b.wastedBytes - a.wastedBytes || a.url.localeCompare(b.url));

  return { images: summarized };
}

function pixels(width?: number, height?: number): string | null {
  if (!width || !height) return null;
  return `${width}×${height}`;
}

function sizesMatch(a: ImageDeliveryReportSize, b: ImageDeliveryReportSize, kind: "file" | "display") {
  const left =
    kind === "file" ? [a.fileWidth, a.fileHeight] : [a.displayWidth, a.displayHeight];
  const right =
    kind === "file" ? [b.fileWidth, b.fileHeight] : [b.displayWidth, b.displayHeight];
  return left.every((value, index) => {
    const other = right[index];
    return value != null && other != null && Math.abs(value - other) <= 2;
  });
}

/** Short lines under a size change: file size, then the size actually shown on each report. */
export function imageSizeLines(reports: ImageDeliveryReportSize[]): string[] {
  const sized = reports.filter(
    (report) => pixels(report.fileWidth, report.fileHeight) || pixels(report.displayWidth, report.displayHeight),
  );
  if (!sized.length) return [];

  const lines: string[] = [];
  const fileSize = pixels(sized[0].fileWidth, sized[0].fileHeight);
  const sameFile = fileSize && sized.every((report) => sizesMatch(sized[0], report, "file"));
  if (sameFile && fileSize) {
    lines.push(`File ${fileSize}`);
  } else {
    for (const report of sized) {
      const size = pixels(report.fileWidth, report.fileHeight);
      if (size) lines.push(`${report.label} file ${size}`);
    }
  }

  const displaySize = pixels(sized[0].displayWidth, sized[0].displayHeight);
  const sameDisplay =
    displaySize && sized.every((report) => sizesMatch(sized[0], report, "display"));
  if (sameDisplay && displaySize) {
    lines.push(`Shown at ${displaySize}`);
  } else {
    for (const report of sized) {
      const size = pixels(report.displayWidth, report.displayHeight);
      if (size) lines.push(`${report.label} shown at ${size}`);
    }
  }

  return lines;
}
