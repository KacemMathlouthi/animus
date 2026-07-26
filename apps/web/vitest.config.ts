/** Vitest config for the web app. Deliberately standalone rather than reusing
 * vite.config.ts: the dev-server proxy, the Tailwind plugin and the share-meta
 * plugin are all irrelevant under test and only slow the run down. All this
 * needs is the React transform, the `@` alias, and a DOM. */

import path from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig, type ViteUserConfig } from "vitest/config";

type VitestPlugin = NonNullable<ViteUserConfig["plugins"]>[number];

export default defineConfig({
  // This workspace runs Vite 8 while vitest 3 still types its config against
  // Vite 7, so the structurally-identical plugin object needs a cast to cross
  // the two copies of the Plugin type. Drop it when vitest moves to Vite 8.
  plugins: [react() as unknown as VitestPlugin],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "./src"),
    },
  },
  test: {
    environment: "jsdom",
    setupFiles: ["./src/__tests__/helpers/setup.ts"],
    // Keeps component tests honest: assertions read the DOM rather than a
    // snapshot of it, so the browser-globals stubs in setup.ts are the only
    // ambient state a test inherits.
    restoreMocks: true,
  },
});
