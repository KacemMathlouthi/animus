import { GrainGradient } from "@paper-design/shaders-react";
import { useTheme } from "@/components/theme-provider";

// Dark: warm sand accent (--primary, dark) blooming over the near-black studio
// neutrals (--background/--card, dark) with a loam midtone (--chart-5, dark).
const DARK = {
	back: "#0a0a0a",
	colors: ["#d8b98a", "#4a3212", "#141414"],
};
// Light: the same warm brand family, lightened — a soft sand-paper base with
// loam and sand accents. Kept off-white (never pure white) so the panel still
// reads warm rather than blank.
const LIGHT = {
	back: "#eae2d4",
	colors: ["#4a3212", "#c2a878", "#ddceb0"],
};

// Resolve the theme to a concrete light/dark, handling "system" via the OS
// preference so the palette matches whatever `.light`/`.dark` is on <html>.
function resolveIsLight(theme: string): boolean {
	if (theme === "light") {
		return true;
	}
	if (theme === "dark") {
		return false;
	}
	return (
		typeof window !== "undefined" &&
		!window.matchMedia("(prefers-color-scheme: dark)").matches
	);
}

export function AuthBackdrop() {
	const { theme } = useTheme();
	const isLight = resolveIsLight(theme);
	const palette = isLight ? LIGHT : DARK;

	return (
		<GrainGradient
			colorBack={palette.back}
			colors={palette.colors}
			height="100%"
			intensity={0.5}
			key={isLight ? "light" : "dark"}
			noise={0.25}
			shape="corners"
			softness={0.5}
			speed={1}
			style={{ height: "100%", width: "100%" }}
			width="100%"
		/>
	);
}
