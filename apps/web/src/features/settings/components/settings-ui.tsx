/** Small building blocks shared by the settings sections: a page heading and a
 * label/description row that hosts a control. */

import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function SectionHeading({
	title,
	description,
}: {
	title: string;
	description: string;
}) {
	return (
		<div className="mb-6 space-y-1">
			<h1 className="font-medium text-2xl tracking-tight">{title}</h1>
			<p className="text-muted-foreground text-sm">{description}</p>
		</div>
	);
}

export function SettingRow({
	title,
	description,
	children,
	stacked = false,
	disabled = false,
}: {
	title: ReactNode;
	description: ReactNode;
	children: ReactNode;
	/** Put the control below the label instead of beside it (for wide controls). */
	stacked?: boolean;
	/** Mute the row and block its control (for not-yet-available settings). */
	disabled?: boolean;
}) {
	return (
		<div
			aria-disabled={disabled || undefined}
			className={cn(
				"flex flex-col gap-3 border-border/60 border-b py-5 last:border-b-0",
				stacked
					? ""
					: "sm:flex-row sm:items-center sm:justify-between sm:gap-6",
				disabled && "opacity-55",
			)}
		>
			<div className="space-y-0.5">
				<div className="flex items-center gap-2 font-medium text-sm">
					{title}
				</div>
				<p className="text-muted-foreground text-sm">{description}</p>
			</div>
			<div
				className={cn(
					stacked ? "" : "shrink-0",
					disabled && "pointer-events-none select-none",
				)}
			>
				{children}
			</div>
		</div>
	);
}

/** Sticky-feel footer with a Save button that only enables when there are
 * unsaved changes, plus a Reset to discard them. */
export function SettingsSaveBar({
	dirty,
	onSave,
	onReset,
}: {
	dirty: boolean;
	onSave: () => void;
	onReset: () => void;
}) {
	return (
		<div className="mt-2 flex items-center justify-end gap-2 border-t pt-5">
			{dirty ? (
				<Button onClick={onReset} variant="ghost">
					Reset
				</Button>
			) : null}
			<Button disabled={!dirty} onClick={onSave}>
				Save changes
			</Button>
		</div>
	);
}
