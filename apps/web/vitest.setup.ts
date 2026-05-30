import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach, beforeEach, vi } from "vitest";
import * as React from "react";

// Mock useId so Radix UI and other components get deterministic IDs regardless of test order
vi.mock("react", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react")>();
  return {
    ...actual,
    useId: vi.fn(),
  };
});

// Mock @radix-ui/react-id so Radix primitives get stable IDs (they may use a different React instance)
const radixUseId = vi.fn();
vi.mock("@radix-ui/react-id", () => ({
  useId: radixUseId.mockReturnValue("_r_"),
}));

const originalLog = console.log;
const originalError = console.error;

// Module-level counter reset in beforeEach so each test gets _r_0_, _r_1_, ... from the start
let idIndex = 0;
function nextId() {
  return `_r_${idIndex}_`;
}

beforeEach(() => {
  idIndex = 0;
  (React.useId as ReturnType<typeof vi.fn>).mockImplementation(nextId);
  radixUseId.mockImplementation(nextId);

  // Fail on console.log
  console.log = (...args: unknown[]) => {
    throw new Error(`console.log is not allowed in tests. Called with: ${JSON.stringify(args)}`);
  };

  // Fail on console.error (suppress at test level via vi.spyOn where needed)
  console.error = (...args: unknown[]) => {
    throw new Error(`console.error is not allowed in tests. Called with: ${JSON.stringify(args)}`);
  };
});

afterEach(() => {
  cleanup();
  console.log = originalLog;
  console.error = originalError;
});
