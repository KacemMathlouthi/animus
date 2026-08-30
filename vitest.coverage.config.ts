import { defineConfig } from "vitest/config";

/** The monorepo-wide coverage run only. NOT named `vitest.config.ts` because a
 * root config by that name is inherited by every package lacking one, and these
 * globs then resolve to nothing. Report-only: no thresholds yet. */
export default defineConfig({
  test: {
    projects: ["apps/*", "packages/*"],
    coverage: {
      provider: "v8",
      all: true,
      include: ["apps/*/src/**/*.{ts,tsx}", "packages/*/src/**/*.ts"],
      // Count only code we wrote and could plausibly break. Leaving the rest
      // in made the headline number track vendored size, not risk.
      exclude: [
        "**/__tests__/**",
        "**/*.test.{ts,tsx}",
        "**/*.d.ts",
        "**/*.config.{ts,js}",
        // Type-only modules compile to nothing.
        "**/types.ts",
        // Vendored shadcn/ui and ai-elements, already foreign to Biome too.
        "apps/web/src/components/ui/**",
        "apps/web/src/components/ai-elements/**",
        // Bare SVG paths.
        "apps/web/src/components/icons/**",
        "apps/web/src/components/brand/social-icons.tsx",
        // Entrypoints and the route table: wiring with no branches.
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
        // Declarative: Drizzle DDL, the db client, Better Auth wiring.
        "packages/db/src/**",
        "packages/auth/src/auth.ts",
        // Named individually: several other index.ts files hold real logic.
        "packages/agent/src/index.ts",
        "packages/auth/src/index.ts",
      ],
      reporter: ["text", "text-summary", "json", "json-summary"],
      reportsDirectory: "./coverage",
    },
  },
});
