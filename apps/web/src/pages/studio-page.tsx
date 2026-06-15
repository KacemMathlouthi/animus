import type { AppBreadcrumbSegment } from "@/components/app/app-breadcrumbs";
import { AppShell } from "@/components/app/app-shell";
import { LogoMark } from "@/components/landing/logo-mark";

const breadcrumbs: AppBreadcrumbSegment[] = [{ title: "New video" }];

export function StudioPage() {
	return (
		<AppShell breadcrumbs={breadcrumbs}>
			<div className="flex flex-1 flex-col items-center justify-center gap-5 text-center">
				<LogoMark animate="loading" className="h-32 w-auto" />
				<div className="space-y-2">
					<h1 className="font-medium text-2xl tracking-tight">
						What do you want to explain?
					</h1>
					<p className="mx-auto max-w-sm text-muted-foreground text-sm">
						Describe a topic and animus will research it and produce a narrated,
						animated explainer.
					</p>
				</div>
			</div>
		</AppShell>
	);
}
