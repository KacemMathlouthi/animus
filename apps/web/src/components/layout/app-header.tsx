import { DecorIcon } from "@/components/decor-icon";
import {
	type AppBreadcrumbSegment,
	AppBreadcrumbs,
} from "@/components/layout/app-breadcrumbs";
import { CustomSidebarTrigger } from "@/components/layout/custom-sidebar-trigger";
import { NavUser } from "@/components/layout/nav-user";
import { OutOfCreditsDialog } from "@/components/layout/out-of-credits-dialog";
import { PublishMenu } from "@/components/layout/publish-menu";
import { ThemeToggle } from "@/components/theme-toggle";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

export function AppHeader({
	breadcrumbs,
}: {
	breadcrumbs?: AppBreadcrumbSegment[];
}) {
	return (
		<header
			className={cn(
				"sticky top-0 z-50 flex h-14 shrink-0 items-center justify-between gap-2 border-b px-4 md:px-6",
				"bg-background/95 backdrop-blur-sm supports-backdrop-filter:bg-background/50",
			)}
		>
			<DecorIcon className="hidden md:block" position="bottom-left" />
			<div className="flex items-center gap-3">
				<CustomSidebarTrigger />
				<Separator
					className="mr-2 h-4 data-[orientation=vertical]:self-center"
					orientation="vertical"
				/>
				<AppBreadcrumbs segments={breadcrumbs} />
			</div>
			<div className="flex items-center gap-3">
				<ThemeToggle />
				<PublishMenu />
				<Separator
					className="h-4 data-[orientation=vertical]:self-center"
					orientation="vertical"
				/>
				<NavUser />
			</div>
			<OutOfCreditsDialog />
		</header>
	);
}
