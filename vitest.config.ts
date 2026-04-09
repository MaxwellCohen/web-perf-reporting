import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
  // Vite 7.3.2+ treats some `next/*` subpath imports as external in the test
  // pipeline; keep them resolvable like pre-7.3.2 Vitest peers.
  ssr: {
    noExternal: ["next"],
  },
  test: {
    testTimeout: 500,
    pool: "threads",
    isolate: true,
    environment: "happy-dom",
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
    setupFiles: ["./vitest.setup.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
      include: ["src/**/*.{ts,tsx}"],
      exclude: [
        "src/**/*.test.{ts,tsx}",
        "src/**/*.spec.{ts,tsx}",
        "src/**/*.d.ts",
        "src/components/ui/*.tsx",
        "src/instrumentation.ts",
        "src/lib/schema.ts",
        "src/features/page-speed-insights/DetailsRender.tsx", // entirely commented out
      ],
      thresholds: {
        statements: 80,
        branches: 70,
        functions: 80,
        lines: 80,
      },
    },
  },
});
