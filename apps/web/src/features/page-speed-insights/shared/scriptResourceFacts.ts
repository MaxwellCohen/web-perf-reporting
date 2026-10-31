import { LONG_TASK_THRESHOLD_MS } from "@/features/page-speed-insights/mainThreadTaskSummary";
import { formatMs } from "@/features/page-speed-insights/shared/format";

/** Other must also be at least this share of total CPU to warn. */
const SCRIPT_CPU_OTHER_SHARE_THRESHOLD = 0.25;

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

/** Residual main-thread time attributed to the script but not parse/eval. */
function scriptCpuOtherMs(cpu: ScriptCpu): number {
  return Math.max(0, cpu.totalMs - cpu.parseMs - cpu.scriptingMs);
}

/** Other is long-task sized and a meaningful share of this script's CPU. */
function isHighScriptCpuOther(cpu: ScriptCpu): boolean {
  const otherMs = scriptCpuOtherMs(cpu);
  if (otherMs < LONG_TASK_THRESHOLD_MS || !(cpu.totalMs > 0)) return false;
  return otherMs / cpu.totalMs >= SCRIPT_CPU_OTHER_SHARE_THRESHOLD;
}

function otherLine(cpu: ScriptCpu): string | null {
  const line = labeledMs("Other", scriptCpuOtherMs(cpu));
  if (!line || !isHighScriptCpuOther(cpu)) return line;
  return `${line} · high`;
}

function scriptCpuLines(cpu: ScriptCpu | undefined): string[] {
  if (!cpu) return [];
  return [
    labeledMs("Total CPU Time", cpu.totalMs),
    labeledMs("Script Parse", cpu.parseMs),
    labeledMs("Script Evaluation", cpu.scriptingMs),
    otherLine(cpu),
  ].filter((line): line is string => line != null);
}

function chainLines(node: CriticalChainNode | undefined): string[] {
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
