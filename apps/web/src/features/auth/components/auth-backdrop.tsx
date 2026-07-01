import { useEffect, useState } from "react";
import { useTheme } from "@/components/theme-provider";
import Grainient from "@/features/auth/components/grainient";

// Source the gradient from the same tokens that carry the brand's single
// chromatic accent (--primary, --chart-2) plus the page's own --background,
// so the backdrop reads as an extension of the site rather than a generic
// SaaS gradient blob.
const TOKENS = {
	color1: "--primary",
	color2: "--chart-2",
	color3: "--background",
};
const FALLBACK = { color1: "#4a3212", color2: "#203b14", color3: "#fbfdf6" };

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
			blendAngle={-12}
			blendSoftness={0.32}
			centerX={0}
			centerY={0}
			colorBalance={0.1}
			contrast={1.1}
			gamma={1.05}
			grainAmount={0.1}
			grainAnimated={false}
			grainScale={1.4}
			noiseScale={1.7}
			rotationAmount={340}
			saturation={0.65}
			timeSpeed={0.12}
			warpAmplitude={40}
			warpFrequency={4}
			warpSpeed={1.2}
			warpStrength={1.1}
			zoom={1.25}
		/>
	);
}
