import { defineConfig } from "vitest/config";

/** Config for the monorepo-wide coverage report (`bun run test:coverage`) — and
 * ONLY that run, which is why it is not named `vitest.config.ts`: a root config
 * by that name is inherited by every package that lacks its own, and the
 * `projects` globs below resolve relative to the package, so an inherited copy
 * fails with "No projects were found".
 *
 * Each workspace is a project so it runs under its own config: `apps/web` needs
 * jsdom and the `@` alias, which the packages neither have nor want. The
 * per-package `turbo run test` runs are untouched — they invoke vitest inside
 * the workspace on plain defaults.
 *
 * Coverage is REPORT-ONLY for now: `all: true` counts every source file (so
 * untested areas show up at 0%), and there are deliberately no thresholds —
 * nothing fails on a low percentage yet. */
export default defineConfig({
  test: {
    projects: ["apps/*", "packages/*"],
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
