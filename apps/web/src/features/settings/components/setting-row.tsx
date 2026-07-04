import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

// A label/description row that hosts a control.
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
