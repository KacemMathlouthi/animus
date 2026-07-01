import type { FinalizeVideoPlanOutput, VideoPlan } from "@animus/core/tools";
import {
	CheckCircle2,
	ListOrdered,
	MessageSquareText,
	PencilLine,
} from "lucide-react";
import { type JSX, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

function sceneCountLabel(count: number): string {
	return `${count} ${count === 1 ? "scene" : "scenes"}`;
}

function sceneKey(scene: VideoPlan["scenes"][number]): string {
	return `${scene.title}\n${scene.description}`;
}

function PlanHeader({
	input,
	label,
	status,
}: {
	input: VideoPlan;
	label: string;
	status: JSX.Element;
}): JSX.Element {
	return (
		<div className="flex items-start justify-between gap-3">
			<div className="min-w-0">
				<p className="flex items-center gap-1.5 text-muted-foreground text-xs">
					<ListOrdered className="size-3.5" />
					{label}
				</p>
				<p className="mt-0.5 font-medium text-sm">{input.title}</p>
			</div>
			{status}
		</div>
	);
}

function SceneList({
	scenes,
	variant,
}: {
	scenes: VideoPlan["scenes"];
	variant: "pending" | "resolved";
}): JSX.Element {
	return (
		<ol
			className={cn(
				"overflow-hidden rounded-sm border",
				variant === "resolved" ? "bg-background/60" : "bg-muted/20",
			)}
		>
			{scenes.map((scene, index) => (
				<li
					className="flex gap-3 border-b p-3 last:border-b-0"
					key={sceneKey(scene)}
				>
					<span
						className={cn(
							"flex size-6 shrink-0 items-center justify-center rounded-sm font-mono text-muted-foreground text-xs",
							variant === "resolved" ? "bg-muted" : "bg-background",
						)}
					>
						{index + 1}
					</span>
					<div className="min-w-0">
						<p className="font-medium text-sm">{scene.title}</p>
						<p className="mt-0.5 text-muted-foreground text-xs leading-relaxed">
							{scene.description}
						</p>
					</div>
				</li>
			))}
		</ol>
	);
}

function PlanStatusBadge({ approved }: { approved: boolean }): JSX.Element {
	const Icon = approved ? CheckCircle2 : MessageSquareText;

	return (
		<Badge className="shrink-0" variant={approved ? "secondary" : "outline"}>
			<Icon data-icon="inline-start" />
			{approved ? "Approved" : "Changes requested"}
		</Badge>
	);
}

function RequestedChanges({ feedback }: { feedback: string }): JSX.Element {
	return (
		<div className="rounded-sm border bg-background/60 p-3">
			<p className="flex items-center gap-1.5 font-medium text-xs">
				<MessageSquareText className="size-3.5" />
				Requested changes
			</p>
			<p className="mt-1 text-muted-foreground text-sm">{feedback}</p>
		</div>
	);
}

export function FinalizeVideoPlanTool({
	input,
	output,
	onRespond,
}: {
	input: VideoPlan;
	output?: FinalizeVideoPlanOutput;
	onRespond: (output: FinalizeVideoPlanOutput) => void;
}): JSX.Element {
	const [feedback, setFeedback] = useState("");

	if (output) {
		return (
			<div className="tool-enter space-y-3 rounded-sm border bg-muted/40 p-3">
				<PlanHeader
					input={input}
					label={sceneCountLabel(input.scenes.length)}
					status={<PlanStatusBadge approved={output.approved} />}
				/>
				<SceneList scenes={input.scenes} variant="resolved" />
				{output.feedback ? (
					<RequestedChanges feedback={output.feedback} />
				) : null}
			</div>
		);
	}

	return (
		<div className="tool-enter space-y-3 rounded-sm border bg-card p-3">
			<PlanHeader
				input={input}
				label="Proposed plan"
				status={
					<Badge className="shrink-0" variant="outline">
						{sceneCountLabel(input.scenes.length)}
					</Badge>
				}
			/>
			<SceneList scenes={input.scenes} variant="pending" />
			<Textarea
				aria-label="Requested plan changes"
				onChange={(event) => setFeedback(event.target.value)}
				placeholder="Optional: what to change…"
				value={feedback}
			/>
			<div className="flex flex-wrap gap-2">
				<Button onClick={() => onRespond({ approved: true })} size="sm">
					<CheckCircle2 />
					Approve plan
				</Button>
				<Button
					disabled={!feedback.trim()}
					onClick={() =>
						onRespond({ approved: false, feedback: feedback.trim() })
					}
					size="sm"
					variant="outline"
				>
					<PencilLine />
					Request changes
				</Button>
			</div>
		</div>
	);
}
