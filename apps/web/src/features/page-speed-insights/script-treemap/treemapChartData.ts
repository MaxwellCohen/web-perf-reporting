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

const GRAY_COLOR = "hsl(220 9% 46%)";
const GREEN_COLOR = "hsl(142 71% 45%)";
const YELLOW_COLOR = "hsl(45 93% 47%)";
const RED_COLOR = "hsl(0 84% 60%)";

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

function truncateMiddle(value: string, maxLength: number): string {
  if (value.length <= maxLength) {
    return value;
  }

  const suffix = value.slice(-(maxLength - 1));
  return `…${suffix}`;
}

function truncatePathPreservingFilename(path: string, maxLength: number): string {
  if (path.length <= maxLength) {
    return path;
  }

  const segments = path.split("/").filter(Boolean);
  const fileName = segments.at(-1);

  if (!fileName) {
    return truncateMiddle(path, maxLength);
  }

  if (fileName.length >= maxLength - 1) {
    return truncateMiddle(fileName, maxLength);
  }

  const prefixBudget = maxLength - fileName.length - 2;
  if (prefixBudget <= 0) {
    return `…/${fileName}`;
  }

  const directory = segments.slice(0, -1).join("/");
  if (!directory) {
    return `/${fileName}`;
  }

  const truncatedDirectory =
    directory.length > prefixBudget
      ? `…/${directory.slice(-(prefixBudget - 1))}`
      : `/${directory}`;

  return `${truncatedDirectory}/${fileName}`;
}

export function getTreemapDisplayLabel(name: string, maxLength = 28): TreemapDisplayLabel {
  if (!name) {
    return { primary: "" };
  }

  if (name.length <= maxLength && !name.startsWith("http")) {
    return { primary: name };
  }

  try {
    const url = new URL(name);
    const host = url.hostname;
    const path = `${url.pathname}${url.search}`;
    const segments = path.split("/").filter(Boolean);
    const primarySource =
      segments.length > 0
        ? segments.length > 1
          ? `/${segments.slice(-2).join("/")}`
          : `/${segments[0]}`
        : path || "/";

    return {
      primary: truncatePathPreservingFilename(primarySource, maxLength),
      secondary: host,
    };
  } catch {
    return {
      primary: truncateMiddle(name, maxLength),
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
