import type { AppBreadcrumbSegment } from "@/components/app/app-breadcrumbs";
import { AppHeader } from "@/components/app/app-header";
import { AppSidebar } from "@/components/app/app-sidebar";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { TooltipProvider } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

export function AppShell({
	breadcrumbs,
	children,
}: {
	breadcrumbs?: AppBreadcrumbSegment[];
	children: React.ReactNode;
}) {
	return (
		<TooltipProvider delayDuration={0}>
			<SidebarProvider className={cn("[--app-wrapper-max-width:80rem]")}>
				<AppSidebar />
				<SidebarInset>
					<AppHeader breadcrumbs={breadcrumbs} />
					<div
						className={cn(
							"flex flex-1 flex-col p-4 md:p-6",
							"mx-auto w-full max-w-(--app-wrapper-max-width)",
						)}
					>
						{children}
					</div>
				</SidebarInset>
			</SidebarProvider>
		</TooltipProvider>
	);
}
