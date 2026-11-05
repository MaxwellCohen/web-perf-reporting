import { CopyButton } from "@/components/ui/copy-button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  buildFixPlanPrompt,
  buildMetricFixPlan,
  formatFixSavings,
} from "@/features/page-speed-insights/RecommendationsSection/fixPlan";
import type { Recommendation } from "@/features/page-speed-insights/RecommendationsSection/types";

export function FixPlanByMetric({ recommendations }: { recommendations: Recommendation[] }) {
  const plans = buildMetricFixPlan(recommendations);
  if (plans.length === 0) return null;
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-2">
          <CardTitle>Fix plan by metric</CardTitle>
          <CopyButton text={buildFixPlanPrompt(plans)}>Copy as AI prompt</CopyButton>
        </div>
        <p className="text-sm text-muted-foreground">
          Biggest estimated wins for each metric, from Lighthouse metric savings.
        </p>
      </CardHeader>
      <CardContent className="grid gap-4 md:grid-cols-2">
        {plans.map((plan) => (
          <div key={plan.metric} className="rounded-md border p-3">
            <div className="mb-2 flex items-center justify-between">
              <span className="font-medium">{plan.metric}</span>
              <Badge variant="outline">
                up to {formatFixSavings(plan.totalSavings, plan.unit)}
              </Badge>
            </div>
            <ol className="space-y-1 text-sm">
              {plan.fixes.map((fix, i) => (
                <li key={fix.id} className="flex justify-between gap-2">
                  <span>
                    {i + 1}. {fix.title}
                  </span>
                  <span className="font-mono text-xs tabular-nums text-muted-foreground">
                    {formatFixSavings(fix.impact.savings ?? 0, fix.impact.unit)}
                  </span>
                </li>
              ))}
            </ol>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
