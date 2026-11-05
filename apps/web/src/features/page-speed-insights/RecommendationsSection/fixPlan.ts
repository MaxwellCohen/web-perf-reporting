import type { Recommendation } from "@/features/page-speed-insights/RecommendationsSection/types";

export type MetricFixPlan = {
  metric: string;
  unit?: string;
  totalSavings: number;
  fixes: Recommendation[];
};

/** Groups recommendations by the metric they improve and ranks fixes by estimated savings. */
export function buildMetricFixPlan(recs: Recommendation[], perMetric = 3): MetricFixPlan[] {
  const byMetric = new Map<string, MetricFixPlan>();
  for (const rec of recs) {
    const { metric, savings, unit } = rec.impact;
    if (!metric || !savings || savings <= 0) continue;
    const plan = byMetric.get(metric) ?? { metric, unit, totalSavings: 0, fixes: [] };
    plan.fixes.push(rec);
    plan.totalSavings += savings;
    byMetric.set(metric, plan);
  }
  return [...byMetric.values()]
    .map((p) => ({
      ...p,
      fixes: p.fixes
        .sort((a, b) => (b.impact.savings ?? 0) - (a.impact.savings ?? 0))
        .slice(0, perMetric),
    }))
    .sort((a, b) => b.totalSavings - a.totalSavings);
}

export function formatFixSavings(value: number, unit?: string): string {
  if (unit === "ms") return `${Math.round(value)} ms`;
  return Number.isInteger(value) ? String(value) : value.toFixed(3);
}

/** Markdown brief a developer can paste into an LLM/agent to start fixing the top issues. */
export function buildFixPlanPrompt(plans: MetricFixPlan[]): string {
  const lines = [
    "Fix these web performance issues found by Lighthouse, biggest estimated wins first.",
    "For each, inspect the codebase, apply the fix, and explain the expected effect.",
    "",
  ];
  for (const plan of plans) {
    lines.push(`## ${plan.metric} (up to ${formatFixSavings(plan.totalSavings, plan.unit)})`);
    for (const fix of plan.fixes) {
      lines.push(`- ${fix.title} (~${formatFixSavings(fix.impact.savings ?? 0, fix.impact.unit)})`);
      for (const step of fix.actionableSteps.slice(0, 2)) lines.push(`  - ${step.step}`);
      const urls = (fix.items ?? [])
        .map((i) => i.url)
        .filter(Boolean)
        .slice(0, 3);
      if (urls.length) lines.push(`  - Resources: ${urls.join(", ")}`);
    }
    lines.push("");
  }
  return lines.join("\n").trim();
}
