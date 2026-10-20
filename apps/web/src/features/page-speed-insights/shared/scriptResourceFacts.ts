import { formatMs } from "@/features/page-speed-insights/shared/format";

/** Main-thread cost of one script, from the bootup-time audit. */
export type ScriptCpu = {
  totalMs: number;
  scriptingMs: number;
  parseMs: number;
};

/** One URL in the network-dependency-tree critical chain. */
export type CriticalChainNode = {
  /** `navStartToEndTime`: navigation start until this request finished. */
  endMs?: number;
  /** How far this request pushes the chain past its parent. */
  extendsMs?: number;
  isLongest?: boolean;
};

function labeledMs(label: string, ms: number): string | null {
  if (!Number.isFinite(ms) || Math.round(ms) <= 0) return null;
  return `${label} ${formatMs(ms)}`;
}

export function scriptCpuLines(cpu: ScriptCpu | undefined): string[] {
  if (!cpu) return [];
  return [
    labeledMs("Total CPU Time", cpu.totalMs),
    labeledMs("Script Parse", cpu.parseMs),
    labeledMs("Script Evaluation", cpu.scriptingMs),
  ].filter((line): line is string => line != null);
}

export function chainLines(node: CriticalChainNode | undefined): string[] {
  if (!node) return [];
  const lines: string[] = [];
  if (node.isLongest) lines.push("Longest chain");
  if (node.endMs != null && node.endMs > 0) lines.push(`Chain time ${formatMs(node.endMs)}`);
  if (node.extendsMs != null && node.extendsMs > 0) {
    lines.push(`Extends chain ${formatMs(node.extendsMs)}`);
  }
  return lines;
}

export function scriptCpuLabel(cpu: ScriptCpu | undefined): string | null {
  const lines = scriptCpuLines(cpu);
  return lines.length > 0 ? lines.join(" · ") : null;
}

export function chainLabel(node: CriticalChainNode | undefined): string | null {
  const lines = chainLines(node);
  return lines.length > 0 ? lines.join(" · ") : null;
}
