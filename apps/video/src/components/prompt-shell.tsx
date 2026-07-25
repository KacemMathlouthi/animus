import { ArrowUpIcon, LightbulbIcon } from "lucide-react";
import type React from "react";
import { cn } from "@/lib/utils";

/** The landing page's hero prompt, rebuilt with its own classes.
 *
 * `.cta-surface`, `.prompt-well`, `.prompt-chip` and `.prompt-send` all come
 * from the imported product stylesheet, so this is the same plate, the same
 * gradient and the same shadow the visitor will actually meet. Only the
 * interactive parts (state, submit, autosize) are dropped, since the film
 * drives them from the timeline. */
export function PromptShell({
	children,
	className,
	sendPressed = 0,
	sendActive = false,
	style,
}: {
	children: React.ReactNode;
	className?: string;
	/** 0 → 1 press animation on the send button. */
	sendPressed?: number;
	sendActive?: boolean;
	style?: React.CSSProperties;
}): React.JSX.Element {
	return (
		<div className={cn("w-full", className)} style={style}>
			<div className="cta-surface flex flex-col gap-3 rounded-3xl p-4">
				<div className="flex items-center px-2 pt-0.5 font-medium text-[20px] text-muted-foreground">
					<span>$5.00 in free credits</span>
				</div>

				<div className="prompt-well flex flex-col gap-4 rounded-2xl border p-5">
					<div className="min-h-[104px] w-full px-2 py-2 text-[34px] leading-snug tracking-tight">
						{children}
					</div>

					<div className="flex items-center justify-between">
						<span className="prompt-chip flex items-center gap-2.5 rounded-lg px-4 py-2.5 font-medium text-[19px] text-muted-foreground">
							<LightbulbIcon aria-hidden className="size-5" />
							Prompts
						</span>
						<span
							className="prompt-send grid size-14 shrink-0 place-items-center rounded-full text-primary-foreground"
							style={{
								opacity: sendActive ? 1 : 0.4,
								transform: `scale(${1 - sendPressed * 0.09})`,
								filter: `brightness(${1 + sendPressed * 0.12})`,
							}}
						>
							<ArrowUpIcon aria-hidden className="size-6" />
						</span>
					</div>
				</div>
			</div>
		</div>
	);
}
