/** Length-independent, constant-time string comparison. */
function safeEqual(a: string | undefined, b: string): boolean {
  if (a === undefined) return false;
  const enc = new TextEncoder();
  const x = enc.encode(a);
  const y = enc.encode(b);
  let diff = x.length ^ y.length;
  for (let i = 0; i < y.length; i++) diff |= (x[i] ?? 0) ^ y[i];
  return diff === 0;
}

export function isAuthorized(
  header: string | undefined,
  queryKey: string | undefined,
  expected: string | undefined,
): boolean {
  if (!expected) return false;
  // Evaluate both so timing does not reveal which one matched.
  const headerOk = safeEqual(header, expected);
  const queryOk = safeEqual(queryKey, expected);
  return headerOk || queryOk;
}
