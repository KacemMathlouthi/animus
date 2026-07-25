import { PanelLeftIcon, SlashIcon } from "lucide-react";
import type React from "react";
import { LogoMark } from "@/components/logo-mark";
import { cn } from "@/lib/utils";

/** The studio, rebuilt at broadcast scale.
 *
 * The app is designed for a 1280-wide viewport, so the film composes it at
 * exactly that width and scales the whole surface up to fill the frame: every
 * radius, border and type size keeps its real proportion instead of being
 * re-guessed at 1920. `SCALE` is the only number that changes if the framing
 * does. */

const STUDIO_WIDTH = 1280;
const STUDIO_HEIGHT = 760;
/** Fills 1562×927 of the 1920×1080 frame: big enough to read, with margin for
 * the canvas to breathe and a caption to sit under it. */
export const STUDIO_SCALE = 1.22;
/** The surface rides slightly above centre so the caption has clean space. */
export const STUDIO_OFFSET_Y = -26;

/** The app header: rail trigger, breadcrumb, and the avatar with its credit
 * gauge ring. */
function Header({ title }: { title: string }): React.JSX.Element {
	return (
		<header className="flex h-14 shrink-0 items-center gap-3 border-b px-4">
			<PanelLeftIcon className="size-4 text-muted-foreground" />
			<div className="h-4 w-px bg-border" />
			<div className="flex min-w-0 items-center gap-2 text-sm">
				<span className="text-muted-foreground">Studio</span>
				<SlashIcon className="size-3 text-muted-foreground/50" />
				<span className="truncate font-medium text-foreground">{title}</span>
			</div>

			<div className="ml-auto flex items-center gap-3">
				{/* The credit gauge: a ring around the avatar, ~78% remaining. */}
				<div className="relative grid size-8 place-items-center">
					<svg
						aria-hidden="true"
						className="-rotate-90 absolute inset-0 size-8"
						role="presentation"
						viewBox="0 0 36 36"
					>
						<circle
							cx="18"
							cy="18"
							fill="none"
							r="16"
							stroke="var(--border)"
							strokeWidth="2"
						/>
						<circle
							cx="18"
							cy="18"
							fill="none"
							r="16"
							stroke="var(--primary)"
							strokeDasharray={`${2 * Math.PI * 16 * 0.78} ${2 * Math.PI * 16}`}
							strokeLinecap="round"
							strokeWidth="2"
						/>
					</svg>
					<div className="grid size-6 place-items-center rounded-full bg-muted font-medium text-[10px] text-muted-foreground">
						K
					</div>
				</div>
			</div>
		</header>
	);
}

/** The conversation rail. Present but quiet: it establishes that this is a
 * workspace with history, not a one-shot generator. */
function Sidebar({ activeTitle }: { activeTitle: string }): React.JSX.Element {
	const past = [
		"How do neural networks learn?",
		"Why do planets orbit in ellipses?",
		"How does RSA keep a secret?",
		"What is entropy, really?",
	];

	return (
		<aside className="flex w-[248px] shrink-0 flex-col gap-4 border-r bg-sidebar p-3">
			<div className="flex items-center gap-2 px-1 py-1">
				<LogoMark className="size-6" />
				<span className="font-medium text-[15px] tracking-tight">animus</span>
			</div>

			<div className="rounded-md border bg-background/40 px-2.5 py-2 text-muted-foreground text-xs">
				Search conversations
			</div>

			<div className="space-y-1">
				<p className="px-2 py-1 font-medium text-[11px] text-muted-foreground uppercase tracking-wider">
					Today
				</p>
				<div className="truncate rounded-md bg-sidebar-accent px-2.5 py-2 text-[13px] text-sidebar-accent-foreground">
					{activeTitle}
				</div>
				{past.map((item) => (
					<div
						className="truncate rounded-md px-2.5 py-2 text-[13px] text-muted-foreground"
						key={item}
					>
						{item}
					</div>
				))}
			</div>
		</aside>
	);
}

/** The caller owns the camera: it passes the full `transform`, because both
 * studio scenes move this surface and the second one flies into it. */
export function StudioFrame({
	title,
	chat,
	panel,
	style,
	className,
}: {
	title: string;
	chat: React.ReactNode;
	panel: React.ReactNode;
	style?: React.CSSProperties;
	className?: string;
}): React.JSX.Element {
	return (
		<div
			className={cn("film-panel overflow-hidden rounded-2xl", className)}
			style={{ width: STUDIO_WIDTH, height: STUDIO_HEIGHT, ...style }}
		>
			<div className="flex h-full w-full bg-background">
				<Sidebar activeTitle={title} />
				<div className="flex min-w-0 flex-1 flex-col">
					<Header title={title} />
					<div className="flex min-h-0 flex-1">
						<section className="flex min-w-0 flex-1 flex-col overflow-hidden border-r">
							{chat}
						</section>
						<section className="relative flex w-[560px] shrink-0 flex-col overflow-hidden bg-card/40">
							{panel}
						</section>
					</div>
				</div>
			</div>
		</div>
	);
}
