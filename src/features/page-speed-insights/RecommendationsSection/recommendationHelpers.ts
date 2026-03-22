export function getRecommendationAuditId(recommendationId: string): string {
  return recommendationId.split('-').slice(0, -1).join('-');
}

export function isNetworkDependencyTreeRecommendation(
  recommendationId: string,
): boolean {
  return recommendationId.startsWith('network-dependency-tree-insight');
}
