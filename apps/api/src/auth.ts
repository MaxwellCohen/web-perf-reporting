export function isAuthorized(
  header: string | undefined,
  queryKey: string | undefined,
  expected: string | undefined,
): boolean {
  if (!expected) return false;
  return header === expected || queryKey === expected;
}
