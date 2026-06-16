import { Wordmark } from "@/components/brand/wordmark";
import { GithubIcon } from "@/components/icons/github-icon";
import { XIcon } from "@/components/icons/x-icon";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function Footer() {
	return (
		<footer
			className={cn(
				"relative mx-auto max-w-5xl border-t lg:border-x",
				"dark:bg-[radial-gradient(35%_80%_at_15%_0%,theme(--color-foreground/.06),transparent)]",
			)}
		>
			<div className="grid max-w-5xl grid-cols-6 gap-6 p-4 md:px-8">
				<div className="col-span-6 flex flex-col gap-4 pt-5 md:col-span-4">
					<Wordmark />
					<p className="max-w-sm text-balance text-muted-foreground text-sm">
						The studio that turns any topic into a narrated, research-grounded
						explainer video.
					</p>
					<div className="flex gap-2">
						{socialLinks.map((item) => (
							<Button asChild key={item.label} size="icon" variant="outline">
								<a
									aria-label={item.label}
									href={item.link}
									rel="noreferrer"
									target="_blank"
								>
									{item.icon}
								</a>
							</Button>
						))}
					</div>
				</div>
				<div className="col-span-3 w-full md:col-span-1">
					<span className="text-muted-foreground text-xs">Product</span>
					<div className="mt-2 flex flex-col gap-2">
						{product.map(({ href, title }) => (
							<a
								className="w-max text-sm hover:underline"
								href={href}
								key={title}
							>
								{title}
							</a>
						))}
					</div>
				</div>
				<div className="col-span-3 w-full md:col-span-1">
					<span className="text-muted-foreground text-xs">Company</span>
					<div className="mt-2 flex flex-col gap-2">
						{company.map(({ href, title }) => (
							<a
								className="w-max text-sm hover:underline"
								href={href}
								key={title}
							>
								{title}
							</a>
						))}
					</div>
				</div>
			</div>
			<div className="flex items-center justify-center gap-2 border-t py-4">
				<p className="text-center font-light text-muted-foreground text-sm">
					&copy; {new Date().getFullYear()} animus · All rights reserved
				</p>
			</div>
		</footer>
	);
}

const company = [
	{ title: "About", href: "#" },
	{ title: "Blog", href: "#" },
	{ title: "Careers", href: "#" },
	{ title: "Contact", href: "#" },
];

const product = [
	{ title: "Features", href: "#features" },
	{ title: "How it works", href: "#how" },
	{ title: "FAQ", href: "#faq" },
	{ title: "Changelog", href: "#" },
];

const socialLinks = [
	{ icon: <GithubIcon />, link: "#", label: "GitHub" },
	{ icon: <XIcon />, link: "#", label: "X" },
];
