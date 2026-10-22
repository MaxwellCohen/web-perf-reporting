import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
      // The API package depends on Vite 8, which installs a second Vitest.
      // Pin tests to this app's copy so snapshot state is the one the runner sets up.
      vitest: path.resolve(__dirname, "node_modules/vitest"),
    },
  },
  // Vite 7.3.2+ treats some `next/*` subpath imports as external in the test
  // pipeline; keep them resolvable like pre-7.3.2 Vitest peers.
  ssr: {
    noExternal: ["next"],
  },
  test: {
    testTimeout: 5000,
    pool: "threads",
    isolate: true,
    environment: "happy-dom",
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
    setupFiles: ["./vitest.setup.ts"],
    server: {
      deps: {
        // jest-dom imports Vitest from the pnpm virtual store, which now also
        // contains the Vite 8 Vitest pulled in by the API app. Bundle it so the
        // alias below binds snapshot state to this app's Vitest.
        inline: ["@testing-library/jest-dom"],
      },
    },
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
