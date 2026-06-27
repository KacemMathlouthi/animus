import type { PublicShareResponse } from "@animus/core";
import {
	ArrowRightIcon,
	CheckIcon,
	DownloadIcon,
	LinkIcon,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router";
import { LogoMark } from "@/components/brand/logo-mark";
import { Wordmark } from "@/components/brand/wordmark";
import { DecorIcon } from "@/components/decor-icon";
import { Button } from "@/components/ui/button";
import { useCtaTarget } from "@/features/landing/hooks/use-cta-target";
import { VideoPlayer } from "@/features/studio/components/video-player";
import { apiFetch } from "@/lib/api";
import { cn } from "@/lib/utils";

const COPIED_RESET_MS = 2000;

type LoadState =
	| { status: "loading" }
	| { status: "error" }
	| { status: "ready"; share: PublicShareResponse };

/** Faded border rails + a soft radial glow — the landing-page treatment, reused
 * so a shared video lands on a page that feels like the product, not a raw file. */
function Backdrop() {
	return (
		<div
			aria-hidden="true"
			className="absolute inset-0 -z-1 size-full overflow-hidden"
		>
			<div
				className={cn(
					"absolute -inset-x-20 inset-y-0 rounded-full",
					"bg-[radial-gradient(ellipse_at_top,theme(--color-foreground/.07),transparent,transparent)]",
					"blur-[60px]",
				)}
			/>
			<div className="absolute inset-y-0 left-4 w-px bg-linear-to-b from-transparent via-border to-border md:left-8" />
			<div className="absolute inset-y-0 right-4 w-px bg-linear-to-b from-transparent via-border to-border md:right-8" />
		</div>
	);
}

function CopyLinkButton() {
	const [copied, setCopied] = useState(false);

	useEffect(() => {
		if (!copied) {
			return;
		}
		const timer = window.setTimeout(() => setCopied(false), COPIED_RESET_MS);
		return () => window.clearTimeout(timer);
	}, [copied]);

	const copy = async () => {
		if (!navigator?.clipboard?.writeText) {
			return;
		}
		try {
			await navigator.clipboard.writeText(window.location.href);
			setCopied(true);
		} catch {
			// Clipboard can be blocked; the URL is still in the address bar.
		}
	};

	return (
		<Button onClick={copy} type="button" variant="outline">
			{copied ? (
				<CheckIcon data-icon="inline-start" />
			) : (
				<LinkIcon data-icon="inline-start" />
			)}
			{copied ? "Copied" : "Copy link"}
		</Button>
	);
}

/** The video, framed as the hero: border + decor corners, sitting on a pooled
 * glow with a heavy shadow. */
function VideoHero({ share }: { share: PublicShareResponse }) {
	return (
		<div
			className={cn(
				"relative w-full",
				"fade-in slide-in-from-bottom-8 animate-in fill-mode-backwards delay-200 duration-700 ease-snappy",
			)}
		>
			<div
				aria-hidden="true"
				className="-inset-6 absolute -z-10 rounded-[2rem] bg-[radial-gradient(ellipse_at_center,theme(--color-primary/.25),transparent_70%)] blur-2xl"
			/>
			<div className="relative aspect-video w-full overflow-hidden rounded-xl border bg-muted shadow-2xl">
				<DecorIcon className="size-4" position="top-left" />
				<DecorIcon className="size-4" position="top-right" />
				<DecorIcon className="size-4" position="bottom-left" />
				<DecorIcon className="size-4" position="bottom-right" />
				<VideoPlayer playToken={0} src={share.videoUrl} title={share.title} />
			</div>
		</div>
	);
}

/** Public, unauthenticated page for an unlisted share link (`/v/:token`). A
 * two-column hero — pitch + CTA on the left, the video on the right — so a shared
 * video doubles as the product's front door. This is the page people post to
 * social media. */
export function SharePage() {
	const { token } = useParams<{ token: string }>();
	const ctaTarget = useCtaTarget();
	const [state, setState] = useState<LoadState>({ status: "loading" });

	useEffect(() => {
		if (!token) {
			setState({ status: "error" });
			return;
		}
		let active = true;
		setState({ status: "loading" });
		apiFetch<PublicShareResponse>(`/api/share/${encodeURIComponent(token)}`)
			.then((share) => {
				if (active) {
					setState({ status: "ready", share });
				}
			})
			.catch(() => {
				if (active) {
					setState({ status: "error" });
				}
			});
		return () => {
			active = false;
		};
	}, [token]);

	return (
		<div className="relative flex min-h-svh flex-col overflow-x-clip bg-background">
			<Backdrop />

			<header className="relative flex h-14 shrink-0 items-center justify-between px-4 md:px-8">
				<Link aria-label="animus home" to="/">
					<Wordmark />
				</Link>
				<Button asChild size="sm" variant="outline">
					<Link to={ctaTarget}>
						Make your own
						<ArrowRightIcon data-icon="inline-end" />
					</Link>
				</Button>
			</header>

			<main className="relative flex flex-1 items-center px-4 py-10 md:px-8 md:py-14">
				{state.status === "loading" ? (
					<div className="mx-auto aspect-video w-full max-w-3xl animate-pulse rounded-xl border bg-muted" />
				) : null}

				{state.status === "error" ? (
					<div className="mx-auto flex max-w-sm flex-col items-center gap-3 text-center">
						<LogoMark className="h-12 opacity-60" />
						<p className="font-semibold text-xl tracking-tight">
							This video isn't available
						</p>
						<p className="text-balance text-muted-foreground text-sm">
							The link may be wrong, or the video has been removed by its owner.
						</p>
						<Button asChild className="mt-2">
							<Link to={ctaTarget}>
								Make your own
								<ArrowRightIcon data-icon="inline-end" />
							</Link>
						</Button>
					</div>
				) : null}

				{state.status === "ready" ? (
					<div className="mx-auto grid w-full max-w-[90rem] items-center gap-10 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-16">
						<div className="flex flex-col items-center gap-7 text-center lg:items-start lg:text-left">
							<Link
								className={cn(
									"group flex w-fit items-center gap-2 rounded-full border bg-card px-3 py-1 shadow-xs",
									"fade-in slide-in-from-bottom-4 animate-in fill-mode-backwards duration-500 ease-snappy",
								)}
								to={ctaTarget}
							>
								<LogoMark className="size-4.5" />
								<span className="text-sm">Made with animus</span>
								<ArrowRightIcon className="size-3.5 -translate-x-0.5 transition-transform duration-150 ease-snappy group-hover:translate-x-0.5" />
							</Link>

							<h1
								className={cn(
									"text-balance font-semibold text-5xl text-foreground tracking-tight md:text-6xl lg:text-7xl",
									"fade-in slide-in-from-bottom-6 animate-in fill-mode-backwards delay-100 duration-500 ease-snappy",
								)}
							>
								{state.share.title}
							</h1>

							<p
								className={cn(
									"max-w-lg text-balance text-muted-foreground text-lg md:text-xl",
									"fade-in slide-in-from-bottom-6 animate-in fill-mode-backwards delay-150 duration-500 ease-snappy",
								)}
							>
								A narrated explainer, researched and animated by animus. Make
								your own in minutes.
							</p>

							<div
								className={cn(
									"flex flex-wrap items-center justify-center gap-3 lg:justify-start",
									"fade-in animate-in fill-mode-backwards delay-300 duration-500 ease-snappy",
								)}
							>
								<Button asChild size="lg">
									<Link to={ctaTarget}>
										Start creating
										<ArrowRightIcon data-icon="inline-end" />
									</Link>
								</Button>
								<Button asChild size="lg" variant="outline">
									<a download href={state.share.downloadUrl}>
										<DownloadIcon data-icon="inline-start" />
										Download
									</a>
								</Button>
								<CopyLinkButton />
							</div>
						</div>

						<VideoHero share={state.share} />
					</div>
				) : null}
			</main>
		</div>
	);
}
