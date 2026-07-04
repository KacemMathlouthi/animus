import { CheckIcon, CopyIcon, LinkIcon } from "lucide-react";
import { useEffect, useState } from "react";
import {
	LinkedInIcon,
	RedditIcon,
	WhatsAppIcon,
	XIcon,
} from "@/components/brand/social-icons";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { createShareLink } from "@/lib/share";

const COPIED_RESET_MS = 2000;

/** Share targets — each opens the network's share intent prefilled with the link (and title where supported). */
const SOCIALS: {
	label: string;
	Icon: React.ComponentType<{ className?: string }>;
	href: (url: string, text: string) => string;
}[] = [
	{
		label: "X",
		Icon: XIcon,
		href: (url, text) =>
			`https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`,
	},
	{
		label: "LinkedIn",
		Icon: LinkedInIcon,
		href: (url) =>
			`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`,
	},
	{
		label: "Reddit",
		Icon: RedditIcon,
		href: (url, text) =>
			`https://www.reddit.com/submit?url=${encodeURIComponent(url)}&title=${encodeURIComponent(text)}`,
	},
	{
		label: "WhatsApp",
		Icon: WhatsAppIcon,
		href: (url, text) =>
			`https://wa.me/?text=${encodeURIComponent(`${text} ${url}`)}`,
	},
];

type LinkState =
	| { status: "loading" }
	| { status: "error" }
	| { status: "ready"; url: string };

/** Creates the permanent public share link lazily (only on open, so having a
 * video doesn't publish it) and offers copy + social-share actions for it. */
export function ShareDialog({
	videoKey,
	title,
	open,
	onOpenChange,
}: {
	videoKey: string;
	title: string;
	open: boolean;
	onOpenChange: (open: boolean) => void;
}) {
	const [link, setLink] = useState<LinkState>({ status: "loading" });
	const [copied, setCopied] = useState(false);

	useEffect(() => {
		if (!open) {
			return;
		}
		let active = true;
		setLink({ status: "loading" });
		setCopied(false);
		createShareLink(videoKey)
			.then((url) => {
				if (active) {
					setLink({ status: "ready", url });
				}
			})
			.catch(() => {
				if (active) {
					setLink({ status: "error" });
				}
			});
		return () => {
			active = false;
		};
	}, [open, videoKey]);

	useEffect(() => {
		if (!copied) {
			return;
		}
		const timer = window.setTimeout(() => setCopied(false), COPIED_RESET_MS);
		return () => window.clearTimeout(timer);
	}, [copied]);

	const url = link.status === "ready" ? link.url : "";

	const copy = async () => {
		if (!(url && navigator?.clipboard?.writeText)) {
			return;
		}
		try {
			await navigator.clipboard.writeText(url);
			setCopied(true);
		} catch {
			// Clipboard can be blocked; the link stays selectable in the field.
		}
	};

	return (
		<Dialog onOpenChange={onOpenChange} open={open}>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>Share video</DialogTitle>
					<DialogDescription>
						Anyone with this link can watch the video. The link stays live.
					</DialogDescription>
				</DialogHeader>

				{link.status === "error" ? (
					<p className="text-destructive text-sm">
						Couldn't create a share link. Please try again.
					</p>
				) : (
					<div className="flex flex-col gap-4">
						<div className="flex items-center gap-2">
							<div className="relative flex-1">
								<LinkIcon className="-translate-y-1/2 absolute top-1/2 left-3 size-4 text-muted-foreground" />
								<Input
									className="pl-9"
									readOnly
									value={link.status === "ready" ? link.url : "Creating link…"}
								/>
							</div>
							<Button
								disabled={link.status !== "ready"}
								onClick={copy}
								type="button"
								variant="outline"
							>
								{copied ? (
									<CheckIcon data-icon="inline-start" />
								) : (
									<CopyIcon data-icon="inline-start" />
								)}
								{copied ? "Copied" : "Copy"}
							</Button>
						</div>

						<div>
							<p className="mb-2 text-muted-foreground text-xs">Share to</p>
							<div className="grid grid-cols-4 gap-2">
								{SOCIALS.map((social) => (
									<Button
										aria-label={`Share to ${social.label}`}
										asChild
										className="h-11 w-full"
										disabled={link.status !== "ready"}
										key={social.label}
										variant="outline"
									>
										<a
											href={url ? social.href(url, title) : undefined}
											rel="noopener noreferrer"
											target="_blank"
										>
											<social.Icon className="size-4" />
										</a>
									</Button>
								))}
							</div>
						</div>
					</div>
				)}
			</DialogContent>
		</Dialog>
	);
}
