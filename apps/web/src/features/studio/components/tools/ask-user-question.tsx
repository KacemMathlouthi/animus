import type { AskUserQuestionInput, AskUserQuestionOutput } from "@animus/core";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

export function AskUserQuestionTool({
	input,
	output,
	onRespond,
}: {
	input: AskUserQuestionInput;
	output?: AskUserQuestionOutput;
	onRespond: (output: AskUserQuestionOutput) => void;
}) {
	const [selected, setSelected] = useState<string[]>([]);
	const [freeText, setFreeText] = useState("");

	// Already answered — show the answer read-only.
	if (output) {
		const answer = [...output.selected];
		if (output.freeText) {
			answer.push(output.freeText);
		}
		return (
			<div className="rounded-lg border bg-muted/40 p-3 text-sm">
				<p className="text-muted-foreground">{input.question}</p>
				<p className="mt-1 font-medium">{answer.join(", ") || "—"}</p>
			</div>
		);
	}

	const toggle = (label: string) => {
		setSelected((current) => {
			if (input.allowMultiple) {
				return current.includes(label)
					? current.filter((value) => value !== label)
					: [...current, label];
			}
			return [label];
		});
	};

	const canSend = selected.length > 0 || freeText.trim().length > 0;

	return (
		<div className="space-y-3 rounded-lg border bg-card p-3">
			<p className="font-medium text-sm">{input.question}</p>
			<div className="flex flex-col gap-1.5">
				{input.options.map((option) => (
					<button
						className={cn(
							"rounded-md border px-3 py-2 text-left text-sm transition-colors",
							selected.includes(option.label)
								? "border-primary bg-primary/10"
								: "hover:bg-muted",
						)}
						key={option.label}
						onClick={() => toggle(option.label)}
						type="button"
					>
						<span className="font-medium">{option.label}</span>
						{option.description ? (
							<span className="block text-muted-foreground text-xs">
								{option.description}
							</span>
						) : null}
					</button>
				))}
			</div>
			{input.allowFreeText === false ? null : (
				<Textarea
					onChange={(event) => setFreeText(event.target.value)}
					placeholder="Or type your own answer…"
					value={freeText}
				/>
			)}
			<Button
				disabled={!canSend}
				onClick={() =>
					onRespond({
						selected,
						freeText: freeText.trim() || undefined,
					})
				}
				size="sm"
			>
				Send answer
			</Button>
		</div>
	);
}
