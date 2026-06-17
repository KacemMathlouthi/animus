/** settings chrome: a slim left rail to switch sections and a scrollable content column on the right
 * (the active section renders into the Outlet). Its own full-height layout, separate from the studio shell. */

import { ChevronLeftIcon, KeyIcon, SlidersIcon, UserIcon } from "lucide-react";
import { Link, NavLink, Outlet } from "react-router";
import { Wordmark } from "@/components/brand/wordmark";
import { cn } from "@/lib/utils";

const SECTIONS = [
	{ to: "/settings/account", label: "Account", icon: UserIcon },
	{ to: "/settings/generation", label: "Generation", icon: SlidersIcon },
	{ to: "/settings/secrets", label: "API keys", icon: KeyIcon },
];

export function SettingsLayout() {
	return (
		<div className="flex h-svh flex-col bg-background md:flex-row">
			<aside className="flex shrink-0 flex-col gap-4 border-b p-4 md:w-64 md:border-r md:border-b-0 md:p-5">
				<Link
					className="-mx-1 inline-flex w-fit items-center gap-1.5 rounded-md px-1.5 py-1 text-muted-foreground text-sm transition-colors hover:bg-muted hover:text-foreground"
					to="/studio"
				>
					<ChevronLeftIcon className="size-4" />
					Back to studio
				</Link>
				<div className="hidden md:block">
					<Wordmark className="text-xl" />
				</div>
				<nav className="flex gap-1 overflow-x-auto md:flex-col">
					{SECTIONS.map((section) => {
						const Icon = section.icon;
						return (
							<NavLink
								className={({ isActive }) =>
									cn(
										"flex shrink-0 items-center gap-2 rounded-md px-2.5 py-1.5 font-medium text-xs transition-colors",
										isActive
											? "bg-muted text-foreground"
											: "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
									)
								}
								key={section.to}
								to={section.to}
							>
								<Icon className="size-4" />
								{section.label}
							</NavLink>
						);
					})}
				</nav>
			</aside>
			<main className="min-h-0 flex-1 overflow-y-auto">
				<div className="mx-auto w-full max-w-2xl px-6 py-10">
					<Outlet />
				</div>
			</main>
		</div>
	);
}
