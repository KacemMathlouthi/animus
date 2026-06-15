import { Link } from "react-router";
import { MobileNav } from "@/components/landing/mobile-nav";
import { Wordmark } from "@/components/landing/wordmark";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { useScroll } from "@/hooks/use-scroll";
import { cn } from "@/lib/utils";

export const navLinks = [
	{
		label: "Features",
		href: "#features",
	},
	{
		label: "How it works",
		href: "#how",
	},
	{
		label: "FAQ",
		href: "#faq",
	},
];

export function Header() {
	const scrolled = useScroll(10);

	return (
		<header
			className={cn(
				"fixed inset-x-2 top-2 z-50 mx-auto max-w-4xl rounded-md border border-transparent transition-all ease-out",
				{
					"border-border bg-background/95 shadow backdrop-blur-sm supports-backdrop-filter:bg-background/60 md:max-w-3xl":
						scrolled,
				},
			)}
		>
			<nav
				className={cn(
					"flex h-14 w-full items-center justify-between px-4 md:h-12 md:transition-all md:ease-out",
					{
						"md:px-2": scrolled,
					},
				)}
			>
				<a
					className="rounded-md px-2 py-1.5 hover:bg-muted dark:hover:bg-muted/50"
					href="#top"
				>
					<Wordmark />
				</a>
				<div className="hidden items-center gap-1 md:flex">
					<div>
						{navLinks.map((link) => (
							<Button asChild key={link.label} size="sm" variant="ghost">
								<a href={link.href}>{link.label}</a>
							</Button>
						))}
					</div>
					<ThemeToggle />
					<Button asChild className="ml-1" size="sm" variant="outline">
						<Link to="/auth">Sign in</Link>
					</Button>
					<Button asChild size="sm">
						<Link to="/auth">Get started</Link>
					</Button>
				</div>
				<div className="flex items-center gap-1 md:hidden">
					<ThemeToggle />
					<MobileNav />
				</div>
			</nav>
		</header>
	);
}
