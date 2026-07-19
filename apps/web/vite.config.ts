// Vite config for the animus web app.
import path from "node:path";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig, loadEnv } from "vite";
import { shareMetaPlugin } from "./plugins/share-meta";

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
	const env = loadEnv(mode, process.cwd(), "");
	const apiTarget = env.VITE_API_URL || "http://localhost:8787";

	return {
		server: {
			// Proxy the API through this origin so one origin serves the app AND the
			// share card / video / embed URLs a crawler fetches for link previews.
			proxy: {
				"/api": { target: apiTarget, changeOrigin: true },
			},
		},
		plugins: [
			react(),
			tailwindcss(),
			// Inject per-share link-preview meta into /v/:token responses (dev).
			shareMetaPlugin({ apiTarget }),
		],
		resolve: {
			alias: {
				"@": path.resolve(__dirname, "./src"),
			},
		},
	};
});
