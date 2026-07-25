import { defineConfig } from "vitest/config";

/** Root vitest config — used for the monorepo-wide coverage report
 * (`bun run test:coverage`). Test discovery stays at vitest defaults, so the
 * per-package `turbo run test` runs are unaffected. Coverage is REPORT-ONLY for
 * now: `all: true` counts every source file (so untested areas like the web app
 * show up at 0%), and there are deliberately no thresholds — nothing fails on a
 * low percentage yet. */
export default defineConfig({
  test: {
    coverage: {
      provider: "v8",
      all: true,
      include: ["apps/*/src/**/*.{ts,tsx}", "packages/*/src/**/*.ts"],
      exclude: [
        "**/__tests__/**",
        "**/*.test.{ts,tsx}",
        "**/*.d.ts",
        "**/*.config.{ts,js}",
      ],
      reporter: ["text", "text-summary", "json", "json-summary"],
      reportsDirectory: "./coverage",
    },
  },
});
