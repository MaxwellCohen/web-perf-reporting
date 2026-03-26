import { vi } from "vitest";

/**
 * Patterns for console.error messages that are known to come from React or
 * third-party libs during tests (hydration, DOM nesting, etc.). Mock at test
 * level when a test triggers these to prevent failures.
 */
const SUPPRESSED_ERROR_PATTERNS = [
  "cannot be a child of",
  "cannot contain a nested",
  "cannot be a descendant of",
  "hydration error",
  "Can't perform a React state update on a component that hasn't mounted yet",
];

/**
 * Mocks console.error to suppress known React/third-party warnings.
 * Call in tests that trigger hydration or DOM nesting warnings.
 * Returns the spy so you can call spy.mockRestore() if needed.
 */
export function suppressConsoleError() {
  return vi.spyOn(console, "error").mockImplementation((...args: unknown[]) => {
    const msg = String(args[0] ?? "");
    const isSuppressed =
      args.length === 0 || SUPPRESSED_ERROR_PATTERNS.some((p) => msg.includes(p));
    if (isSuppressed) return;
    throw new Error(`console.error is not allowed in tests. Called with: ${JSON.stringify(args)}`);
  });
}
