// Remotion config for the animus launch video.
//
// The web app's Tailwind v4 stylesheet is the single source of design truth
// here: `src/styles.css` imports it directly, so every token, keyframe, and
// utility class in the video is the one the product actually ships.
import path from "node:path";
import { Config } from "@remotion/cli/config";
import { enableTailwind } from "@remotion/tailwind-v4";

Config.setVideoImageFormat("jpeg");
Config.setOverwriteOutput(true);
// Visually lossless at 1080p; the file still lands well under X's limits.
Config.setCrf(17);
Config.setPixelFormat("yuv420p");
Config.setCodec("h264");
// The scenes are DOM-heavy (shadows, gradients, masks); a modest concurrency
// keeps each headless tab responsive enough to hit frame deadlines.
Config.setConcurrency(4);
Config.setChromiumOpenGlRenderer("angle");

// `@/…` matches the tsconfig paths entry. Remotion's bundler does not read
// tsconfig paths, so the alias is declared here as well and the two must agree.
Config.overrideWebpackConfig((current) => ({
	...enableTailwind(current),
	resolve: {
		...enableTailwind(current).resolve,
		alias: {
			...enableTailwind(current).resolve?.alias,
			"@": path.resolve(process.cwd(), "src"),
			// The imported product stylesheet declares its `@font-face` against the
			// web app's public root (`url("/fonts/…")`). Remotion serves `public/`
			// at that same root at render time, but its bundler still has to resolve
			// the file on disk, so the root path is mapped to the real directory.
			"/fonts": path.resolve(process.cwd(), "../web/public/fonts"),
		},
	},
}));
