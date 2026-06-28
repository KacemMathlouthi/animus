import { useEffect, useState } from "react";
import { Shimmer } from "@/components/ai-elements/shimmer";
import { MorphLogo } from "@/features/studio/components/morph-logo";

const steps = [
	"Preparing workspace…",
	"Warming things up…",
	"Setting the stage…",
];

export function StudioLoading() {
	const [step, setStep] = useState(0);

	useEffect(() => {
		const id = setInterval(
			() => setStep((prev) => (prev + 1) % steps.length),
			1800,
		);
		return () => clearInterval(id);
	}, []);

	return (
		<div className="flex flex-1 flex-col items-center justify-center gap-6">
			<MorphLogo className="h-32" />
			<Shimmer>{steps[step]}</Shimmer>
		</div>
	);
}
