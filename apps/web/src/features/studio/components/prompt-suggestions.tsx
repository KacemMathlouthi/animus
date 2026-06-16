import { useEffect, useRef } from "react";
import { Suggestion } from "@/components/ai-elements/suggestion";
import { studioSuggestions } from "@/features/studio/data";

const FADE =
	"linear-gradient(to right, transparent, black 14%, black 86%, transparent)";

export function PromptSuggestions({
	onSelect,
}: {
	onSelect: (text: string) => void;
}) {
	const scrollerRef = useRef<HTMLDivElement>(null);

	// Start centered on the middle suggestion so both ends look scrollable.
	useEffect(() => {
		const el = scrollerRef.current;
		if (el) {
			el.scrollLeft = (el.scrollWidth - el.clientWidth) / 2;
		}
	}, []);

	return (
		<div
			className="w-full overflow-x-auto [-webkit-mask-image:var(--fade)] [-ms-overflow-style:none] [mask-image:var(--fade)] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
			ref={scrollerRef}
			style={{ "--fade": FADE } as React.CSSProperties}
		>
			<div className="flex w-max items-center gap-2 px-[15%]">
				{studioSuggestions.map((item) => (
					<Suggestion key={item} onClick={onSelect} suggestion={item} />
				))}
			</div>
		</div>
	);
}
