import { useEffect, useState } from "react";
import Grainient from "@/components/grainient";
import { useTheme } from "@/components/theme-provider";

// Source the gradient from theme tokens (the botanical --chart-* ramp, which
// already inverts per theme in index.css) rather than hardcoded hex.
const TOKENS = {
	color1: "--chart-3",
	color2: "--chart-1",
	color3: "--chart-5",
};
const FALLBACK = { color1: "#6f9e57", color2: "#4a3212", color3: "#c5ccb6" };

function readTokenColors() {
	if (typeof window === "undefined") {
		return FALLBACK;
	}
	const styles = getComputedStyle(document.documentElement);
	const read = (token: string, fallback: string) =>
		styles.getPropertyValue(token).trim() || fallback;
	return {
		color1: read(TOKENS.color1, FALLBACK.color1),
		color2: read(TOKENS.color2, FALLBACK.color2),
		color3: read(TOKENS.color3, FALLBACK.color3),
	};
}

export function AuthBackdrop() {
	const { theme } = useTheme();
	const [colors, setColors] = useState(readTokenColors);

	// Re-read after the theme class lands on <html> (next frame). `theme` is in
	// deps so a toggle re-runs this once the .dark class has been applied.
	useEffect(() => {
		if (!theme) {
			return;
		}
		const frame = requestAnimationFrame(() => setColors(readTokenColors()));
		return () => cancelAnimationFrame(frame);
	}, [theme]);

	return (
		<Grainient
			{...colors}
			blendAngle={0}
			blendSoftness={0.18}
			centerX={0}
			centerY={0}
			colorBalance={0}
			contrast={1.12}
			gamma={1}
			grainAmount={0.06}
			grainAnimated={false}
			grainScale={1.6}
			noiseScale={1.4}
			rotationAmount={280}
			saturation={0.82}
			timeSpeed={0.14}
			warpAmplitude={90}
			warpFrequency={3.5}
			warpSpeed={1.4}
			warpStrength={1}
			zoom={1.05}
		/>
	);
}
