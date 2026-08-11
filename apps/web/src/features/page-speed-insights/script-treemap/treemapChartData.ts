import type { TreeMapNode } from "@/lib/schema";

export type TreemapChartNode = {
  id: string;
  /** Unique value used by Recharts for React keys. */
  name: string;
  /** Original script URL or inline label from Lighthouse. */
  fullName: string;
  size: number;
  resourceBytes: number;
  unusedBytes?: number;
  children?: TreemapChartNode[];
};

const GRAY_COLOR = "hsl(220 10% 68%)";
const GREEN_COLOR = "hsl(142 45% 62%)";
const YELLOW_COLOR = "hsl(43 85% 62%)";
const RED_COLOR = "hsl(0 70% 68%)";

export function getTreemapNodeColor(resourceBytes: number, unusedBytes?: number): string {
  if (!unusedBytes) {
    return GRAY_COLOR;
  }

  const percent = (unusedBytes / resourceBytes) * 100;

  if (percent > 90) {
    return RED_COLOR;
  }
  if (percent > 25) {
    return YELLOW_COLOR;
  }
  return GREEN_COLOR;
}

export type TreemapDisplayLabel = {
  primary: string;
  secondary?: string;
};

function truncateEnd(value: string, maxLength: number): string {
  if (value.length <= maxLength) {
    return value;
  }

  if (maxLength <= 1) {
    return "…";
  }

  return `${value.slice(0, maxLength - 1)}…`;
}

function truncateMiddle(value: string, maxLength: number): string {
  if (value.length <= maxLength) {
    return value;
  }

  if (maxLength <= 1) {
    return "…";
  }

  const suffix = value.slice(-(maxLength - 1));
  return `…${suffix}`;
}

function truncatePathPreservingFilename(path: string, maxLength: number): string {
  if (path.length <= maxLength) {
    return path;
  }

  const [pathOnly, query = ""] = path.split("?");
  const querySuffix = query ? `?${query}` : "";
  const segments = pathOnly.split("/").filter(Boolean);
  const fileName = segments.at(-1);

  if (!fileName) {
    return truncateMiddle(path, maxLength);
  }

  const fileWithQuery = `${fileName}${querySuffix}`;
  if (fileWithQuery.length >= maxLength - 1) {
    return truncateMiddle(fileWithQuery, maxLength);
  }

  const prefixBudget = maxLength - fileWithQuery.length - 2;
  if (prefixBudget <= 0) {
    return `…/${fileWithQuery}`;
  }

  const directory = segments.slice(0, -1).join("/");
  if (!directory) {
    return `/${fileWithQuery}`;
  }

  const truncatedDirectory =
    directory.length > prefixBudget
      ? `…/${directory.slice(-(prefixBudget - 1))}`
      : `/${directory}`;

  return `${truncatedDirectory}/${fileWithQuery}`;
}

function formatInlineLabel(name: string, maxLength: number): TreemapDisplayLabel {
  const prefix = "(inline)";
  if (name.length <= maxLength) {
    return { primary: name };
  }

  if (maxLength <= prefix.length) {
    return { primary: truncateEnd(prefix, maxLength) };
  }

  if (!name.startsWith(prefix)) {
    return { primary: truncateEnd(name, maxLength) };
  }

  const rest = name.slice(prefix.length).trimStart();
  const restBudget = maxLength - prefix.length - 1;
  if (restBudget <= 1) {
    return { primary: prefix };
  }

  return { primary: `${prefix} ${truncateEnd(rest, restBudget)}` };
}

function buildUrlPrimary(url: URL, maxLength: number): string {
  const segments = url.pathname.split("/").filter(Boolean);
  if (segments.length === 0) {
    return truncateEnd(url.hostname, maxLength);
  }

  const idParam = url.searchParams.get("id");
  const fileName = segments.at(-1) ?? segments[0];
  const twoSegmentPath =
    segments.length > 1 ? `/${segments.slice(-2).join("/")}` : `/${fileName}`;
  const filePath = `/${fileName}`;

  const withId = (path: string) => {
    if (!idParam) {
      return path;
    }
    const candidate = `${path}?id=${idParam}`;
    return candidate.length <= maxLength ? candidate : path;
  };

  const preferred =
    withId(twoSegmentPath).length <= maxLength ? withId(twoSegmentPath) : withId(filePath);

  return truncatePathPreservingFilename(preferred, maxLength);
}

export function getTreemapDisplayLabel(name: string, maxLength = 28): TreemapDisplayLabel {
  if (!name) {
    return { primary: "" };
  }

  if (name.startsWith("(inline)")) {
    return formatInlineLabel(name, maxLength);
  }

  if (name.length <= maxLength && !name.startsWith("http")) {
    return { primary: name };
  }

  try {
    const url = new URL(name);
    const host = url.hostname;
    const segments = url.pathname.split("/").filter(Boolean);

    if (segments.length === 0) {
      return { primary: truncateEnd(host, maxLength) };
    }

    return {
      primary: buildUrlPrimary(url, maxLength),
      secondary: host,
    };
  } catch {
    return {
      primary: truncateEnd(name, maxLength),
    };
  }
}

export function getTreemapLabel(name: string, maxLength = 28): string {
  const { primary, secondary } = getTreemapDisplayLabel(name, maxLength);

  if (!secondary) {
    return primary;
  }

  const combined = `${primary} · ${secondary}`;
  return combined.length <= maxLength ? combined : primary;
}

export function buildTreemapChartNodes(
  nodes: TreeMapNode[],
  parentId = "treemap",
): TreemapChartNode[] {
  return nodes.map((node, index) => {
    const id = `${parentId}-${index}`;
    const children = node.children?.length ? buildTreemapChartNodes(node.children, id) : undefined;

    return {
      id,
      name: id,
      fullName: node.name,
      size: node.resourceBytes,
      resourceBytes: node.resourceBytes,
      unusedBytes: node.unusedBytes,
      children,
    };
  });
}

export async function copyTreemapNodeName(name: string): Promise<boolean> {
  if (!name) {
    return false;
  }

  try {
    await navigator.clipboard.writeText(name);
    return true;
  } catch {
    return false;
  }
}
