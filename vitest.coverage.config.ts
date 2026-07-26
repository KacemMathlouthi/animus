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
      // What's excluded is as meaningful as what's measured. The rule: count
      // code we wrote and could plausibly break. Everything below is either
      // third-party, type-only, or declarative — testing it would assert that
      // markup is markup, and leaving it in made the headline number track the
      // size of our vendored directories instead of our risk.
      exclude: [
        "**/__tests__/**",
        "**/*.test.{ts,tsx}",
        "**/*.d.ts",
        "**/*.config.{ts,js}",
        // Type-only modules compile to nothing.
        "**/types.ts",
        // Vendored: shadcn/ui primitives and ai-elements, ~10.7k lines we
        // don't own and upstream tests. Already treated as foreign by the
        // Biome overrides in apps/web/biome.jsonc.
        "apps/web/src/components/ui/**",
        "apps/web/src/components/ai-elements/**",
        // Bare SVG paths.
        "apps/web/src/components/icons/**",
        "apps/web/src/components/brand/social-icons.tsx",
        // Entrypoints and the route table: wiring with no branches of ours.
        "apps/web/src/main.tsx",
        "apps/web/src/App.tsx",
        "apps/api/src/server.ts",
        // Static content — prose in JSX, no behaviour.
        "apps/web/src/pages/privacy-page.tsx",
        "apps/web/src/pages/terms-page.tsx",
        "apps/web/src/features/legal/**",
        // Static option tables (voices, music tracks, providers, nav links).
        "apps/web/src/features/settings/data/**",
        "apps/web/src/features/landing/components/nav-links.ts",
        // Declarative infrastructure: Drizzle schema DDL, the db client, and
        // the Better Auth wiring — all config, per the testing standards.
        "packages/db/src/**",
        "packages/auth/src/auth.ts",
        // Re-export barrels (named individually: several `index.ts` files in
        // core and agent hold real logic and must stay measured).
        "packages/agent/src/index.ts",
        "packages/auth/src/index.ts",
      ],
      reporter: ["text", "text-summary", "json", "json-summary"],
      reportsDirectory: "./coverage",
    },
  },
});
