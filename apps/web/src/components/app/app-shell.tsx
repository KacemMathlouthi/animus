import type { AppBreadcrumbSegment } from "@/components/app/app-breadcrumbs";
import { AppHeader } from "@/components/app/app-header";
import { AppSidebar } from "@/components/app/app-sidebar";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { TooltipProvider } from "@/components/ui/tooltip";

export function AppShell({
	breadcrumbs,
	children,
}: {
	breadcrumbs?: AppBreadcrumbSegment[];
	children: React.ReactNode;
}) {
	return (
		<TooltipProvider delayDuration={0}>
			<SidebarProvider>
				<AppSidebar />
				<SidebarInset className="h-svh overflow-hidden">
					<AppHeader breadcrumbs={breadcrumbs} />
					<div className="flex min-h-0 flex-1 flex-col">{children}</div>
				</SidebarInset>
			</SidebarProvider>
		</TooltipProvider>
	);
}
