export function getRecommendationPriority(
  score: number | null | undefined,
  savings?: number,
): "high" | "medium" | "low" {
  if (score === 0 || score === null || score === undefined) return "high";
  if (score < 0.5) return "high";
  if (score < 0.75) return "medium";
  if (savings && savings > 1000) return "high";
  if (savings && savings > 500) return "medium";
  return "low";
}
