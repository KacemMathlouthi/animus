import type { RenderSceneInput, RenderSceneOutput } from "@animus/core/tools";
import { FilmIcon, TriangleAlertIcon } from "lucide-react";
import type { ReactNode } from "react";

/** A compact one-line record of a sandbox action (write/read/list/run). */
export function ManimStep({
	icon,
	title,
	detail,
}: {
	icon: ReactNode;
	title: string;
	detail?: string;
}) {
	return (
		<div className="my-1.5 flex items-center gap-2 rounded-md border bg-card px-2.5 py-1.5">
			<span className="text-muted-foreground">{icon}</span>
			<span className="font-medium text-sm">{title}</span>
			{detail ? (
				<span className="min-w-0 truncate text-muted-foreground text-xs">
					{detail}
				</span>
			) : null}
		</div>
	);
}

export function RenderSceneTool({
	input,
	output,
}: {
	input: RenderSceneInput;
	output: RenderSceneOutput;
}) {
	if (output.ok && output.videoUrl) {
		return (
			<div className="my-3 overflow-hidden rounded-lg border bg-card p-2.5">
				<div className="mb-2 flex items-center gap-2">
					<FilmIcon className="size-4 text-muted-foreground" />
					<p className="font-medium text-sm">Rendered {input.scene}</p>
				</div>
				{/* biome-ignore lint/a11y/useMediaCaption: generated explainer has no caption track yet */}
				<video
					className="w-full rounded-md border bg-black"
					controls
					playsInline
					src={output.videoUrl}
				/>
			</div>
		);
	}

	return (
		<div className="my-3 overflow-hidden rounded-lg border border-destructive/40 bg-destructive/5 p-2.5">
			<div className="mb-2 flex items-center gap-2">
				<TriangleAlertIcon className="size-4 text-destructive" />
				<p className="font-medium text-sm">Render failed: {input.scene}</p>
			</div>
			<pre className="max-h-48 overflow-auto whitespace-pre-wrap rounded-md bg-muted/50 p-2 text-muted-foreground text-xs">
				{output.logs || "No output."}
			</pre>
		</div>
	);
}
