import type {
	EditFileInput,
	RenderSceneInput,
	RenderSceneOutput,
	RunCommandInput,
	RunCommandOutput,
} from "@animus/core/tools";
import {
	ChevronDownIcon,
	FilePenIcon,
	PlayIcon,
	TerminalIcon,
	TriangleAlertIcon,
} from "lucide-react";
import type { ReactNode } from "react";
import {
	Collapsible,
	CollapsibleContent,
	CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";

/** A compact one-line record of a sandbox action (write/read/list). */
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

/** A shell command: one-line header (command truncated, never wraps) that
 * expands to show the full command and its combined output. */
export function RunCommandTool({
	input,
	output,
}: {
	input: RunCommandInput;
	output?: RunCommandOutput;
}) {
	const failed = output ? output.exitCode !== 0 : false;

	return (
		<Collapsible className="group my-1.5 w-full overflow-hidden rounded-md border bg-card">
			<CollapsibleTrigger className="flex w-full items-center gap-2 px-2.5 py-1.5 text-left">
				<TerminalIcon className="size-3.5 shrink-0 text-muted-foreground" />
				<span className="shrink-0 font-medium text-sm">Ran command</span>
				<code className="min-w-0 flex-1 truncate font-mono text-muted-foreground text-xs">
					{input.command}
				</code>
				<ChevronDownIcon className="size-3.5 shrink-0 text-muted-foreground transition-transform group-data-[state=open]:rotate-180" />
			</CollapsibleTrigger>
			<CollapsibleContent className="space-y-2 border-t px-2.5 py-2">
				<div className="space-y-1">
					<p className="font-medium text-muted-foreground text-xs uppercase tracking-wide">
						Command
					</p>
					<pre className="overflow-x-auto whitespace-pre-wrap break-all rounded-md bg-muted/50 p-2 font-mono text-foreground text-xs">
						{input.command}
					</pre>
				</div>
				{output ? (
					<div className="space-y-1">
						<p className="font-medium text-muted-foreground text-xs uppercase tracking-wide">
							{failed ? `Output · exit ${output.exitCode}` : "Output"}
						</p>
						<pre
							className={cn(
								"max-h-48 overflow-auto whitespace-pre-wrap break-all rounded-md p-2 font-mono text-xs",
								failed
									? "bg-destructive/10 text-destructive"
									: "bg-muted/50 text-muted-foreground",
							)}
						>
							{output.output || "No output."}
						</pre>
					</div>
				) : null}
			</CollapsibleContent>
		</Collapsible>
	);
}

/** A surgical edit, shown as a compact one-liner with the file path — like the
 * other sandbox steps. On failure it takes the destructive treatment the render
 * tool uses and surfaces the server's reason, but never the before/after snippet. */
export function EditFileTool({
	input,
	failed,
	errorText,
}: {
	input: EditFileInput;
	failed: boolean;
	errorText?: string;
}) {
	if (failed) {
		return (
			<div className="my-1.5 rounded-md border border-destructive/40 bg-destructive/5 px-2.5 py-1.5">
				<div className="flex items-center gap-2">
					<TriangleAlertIcon className="size-3.5 shrink-0 text-destructive" />
					<span className="shrink-0 font-medium text-sm">Edit failed</span>
					<code className="min-w-0 flex-1 truncate font-mono text-muted-foreground text-xs">
						{input.path}
					</code>
				</div>
				{errorText ? (
					<p className="mt-1 pl-5 text-destructive text-xs">{errorText}</p>
				) : null}
			</div>
		);
	}

	return (
		<ManimStep
			detail={input.path}
			icon={<FilePenIcon className="size-3.5" />}
			title="Edited file"
		/>
	);
}

export function RenderSceneTool({
	input,
	output,
	onOpen,
}: {
	input: RenderSceneInput;
	output: RenderSceneOutput;
	onOpen?: (url: string) => void;
}) {
	if (output.ok && output.videoUrl) {
		const url = output.videoUrl;
		return (
			<button
				className="group my-3 flex w-full items-center gap-3 rounded-lg border bg-card p-2.5 text-left transition-colors hover:bg-accent"
				onClick={() => onOpen?.(url)}
				type="button"
			>
				<span className="relative flex size-11 shrink-0 items-center justify-center overflow-hidden rounded-md border bg-black">
					{/* A muted, controls-free frame as the artifact's thumbnail; playback
					    happens in the side panel. biome-ignore lint/a11y/useMediaCaption: preview frame only. */}
					<video
						className="pointer-events-none h-full w-full object-cover"
						muted
						playsInline
						preload="metadata"
						src={url}
					/>
					<span className="absolute inset-0 flex items-center justify-center bg-black/30 transition-colors group-hover:bg-black/10">
						<PlayIcon className="size-4 fill-white text-white" />
					</span>
				</span>
				<span className="min-w-0 flex-1">
					<span className="block font-medium text-sm">Your video is ready</span>
					<span className="block truncate text-muted-foreground text-xs">
						{input.scene}
					</span>
				</span>
				<PlayIcon className="size-4 shrink-0 text-muted-foreground" />
			</button>
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
