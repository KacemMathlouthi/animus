import { AudioLinesIcon, PlayIcon } from "lucide-react";
import { cn } from "@/lib/utils";

const scenes = [
	{ label: "Intuition", state: "done" },
	{ label: "The integral", state: "active" },
	{ label: "Worked example", state: "queued" },
	{ label: "Recap", state: "queued" },
] as const;

export function StudioPreview() {
	return (
		<div className="overflow-hidden rounded-xl border bg-card shadow-sm">
			{/* Chrome */}
			<div className="flex items-center justify-between gap-3 border-b px-4 py-2.5">
				<div className="flex items-center gap-2 text-muted-foreground text-xs">
					<span className="inline-flex size-1.5 animate-pulse rounded-full bg-primary" />
					Rendering scene 02 — “The integral”
				</div>
				<span className="font-mono text-muted-foreground text-xs">04:12</span>
			</div>

			{/* Video frame */}
			<div className="relative aspect-video w-full bg-muted/40">
				<div className="absolute inset-0 bg-[radial-gradient(120%_120%_at_50%_0%,theme(--color-foreground/.04),transparent_60%)]" />

				{/* play affordance */}
				<div className="absolute inset-0 flex items-center justify-center">
					<span className="flex size-14 items-center justify-center rounded-full border bg-background/80 text-foreground shadow-sm backdrop-blur-sm">
						<PlayIcon className="size-5 translate-x-px fill-current" />
					</span>
				</div>

				{/* caption */}
				<div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-4 p-4 md:p-5">
					<div className="space-y-1">
						<p className="font-medium text-foreground text-sm md:text-base">
							Why integration measures area under a curve
						</p>
						<p className="flex items-center gap-1.5 text-muted-foreground text-xs">
							<AudioLinesIcon className="size-3.5" /> Narrated · grounded in 7
							sources
						</p>
					</div>
				</div>
			</div>

			{/* Scene strip */}
			<div className="grid grid-cols-2 gap-px border-t bg-border sm:grid-cols-4">
				{scenes.map((scene, index) => (
					<div
						className="flex items-center gap-2 bg-card px-3 py-2.5"
						key={scene.label}
					>
						<span className="font-mono text-muted-foreground text-xs">
							{String(index + 1).padStart(2, "0")}
						</span>
						<span className="truncate text-foreground text-xs">
							{scene.label}
						</span>
						<span
							className={cn(
								"ml-auto size-1.5 shrink-0 rounded-full",
								scene.state === "done" && "bg-primary",
								scene.state === "active" && "animate-pulse bg-primary",
								scene.state === "queued" && "bg-muted-foreground/30",
							)}
						/>
					</div>
				))}
			</div>
		</div>
	);
}
