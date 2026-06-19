import type { FinalizeVideoPlanOutput, VideoPlan } from "@animus/core";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

export function FinalizeVideoPlanTool({
	input,
	output,
	onRespond,
}: {
	input: VideoPlan;
	output?: FinalizeVideoPlanOutput;
	onRespond: (output: FinalizeVideoPlanOutput) => void;
}) {
	const [feedback, setFeedback] = useState("");

	// Already decided — show the outcome read-only.
	if (output) {
		return (
			<div className="rounded-lg border bg-muted/40 p-3 text-sm">
				<p className="font-medium">
					{output.approved ? "Plan approved" : "Changes requested"}
				</p>
				{output.feedback ? (
					<p className="mt-1 text-muted-foreground">{output.feedback}</p>
				) : null}
			</div>
		);
	}

	return (
		<div className="space-y-3 rounded-lg border bg-card p-3">
			<p className="font-medium text-sm">{input.title}</p>
			<ol className="space-y-2">
				{input.scenes.map((scene, index) => (
					<li className="text-sm" key={scene.title}>
						<span className="font-medium">
							{index + 1}. {scene.title}
						</span>
						<p className="text-muted-foreground text-xs">{scene.description}</p>
					</li>
				))}
			</ol>
			<Textarea
				onChange={(event) => setFeedback(event.target.value)}
				placeholder="Optional: what to change…"
				value={feedback}
			/>
			<div className="flex gap-2">
				<Button onClick={() => onRespond({ approved: true })} size="sm">
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
					Request changes
				</Button>
			</div>
		</div>
	);
}
