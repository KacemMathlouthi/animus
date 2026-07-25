import type {
	AskUserQuestionInput,
	AskUserQuestionOutput,
} from "@animus/core/tools";
import { CheckIcon } from "lucide-react";
import { type ReactNode, useState } from "react";
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
}): ReactNode {
	const [selected, setSelected] = useState<string[]>([]);
	const [freeText, setFreeText] = useState("");
	const isAnswered = output != null;
	const selectedLabels = output?.selected ?? selected;
	const selectedLabelSet = new Set(selectedLabels);
	const visibleOptions = output
		? input.options.filter((option) => output.selected.includes(option.label))
		: input.options;

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
	const sendAnswer = () =>
		onRespond({
			selected,
			freeText: freeText.trim() || undefined,
		});

	return (
		<div className="tool-enter space-y-3 rounded-sm border bg-card p-3">
			{/* fieldset+legend groups the options and labels them with the question
			    for assistive tech (the legend is the visible question). */}
			<fieldset className="m-0 border-0 p-0">
				<legend className="mb-2 font-medium text-sm">{input.question}</legend>
				<div className="flex flex-col gap-1.5">
					{visibleOptions.map((option) => {
						const isSelected = selectedLabelSet.has(option.label);
						return (
							<button
								aria-pressed={isSelected}
								className={cn(
									"flex items-start gap-2 rounded-sm border px-3 py-2 text-left text-sm transition-colors",
									isSelected
										? "border-primary bg-primary/10 text-primary"
										: "hover:bg-muted",
								)}
								disabled={isAnswered}
								key={option.label}
								onClick={isAnswered ? undefined : () => toggle(option.label)}
								type="button"
							>
								{/* Visible selected indicator so state isn't conveyed by color alone. */}
								<CheckIcon
									aria-hidden="true"
									className={cn(
										"mt-0.5 size-4 shrink-0",
										isSelected ? "opacity-100" : "opacity-0",
									)}
								/>
								<span>
									<span className="font-medium">{option.label}</span>
									{option.description ? (
										<span className="block text-muted-foreground text-xs">
											{option.description}
										</span>
									) : null}
								</span>
							</button>
						);
					})}
				</div>
			</fieldset>
			{isAnswered ? null : (
				<div className="space-y-3" key="controls">
					{input.allowFreeText === false ? null : (
						<Textarea
							onChange={(event) => setFreeText(event.target.value)}
							placeholder="Or type your own answer…"
							value={freeText}
						/>
					)}
					<Button disabled={!canSend} onClick={sendAnswer} size="sm">
						Send answer
					</Button>
				</div>
			)}

			{output?.freeText ? (
				<p className="text-muted-foreground text-sm" key="free-text">
					{output.freeText}
				</p>
			) : null}
		</div>
	);
}
