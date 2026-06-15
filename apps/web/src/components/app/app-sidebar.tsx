import { ConversationList } from "@/components/app/conversation-list";
import { SidebarSearch } from "@/components/app/sidebar-search";
import { Wordmark } from "@/components/landing/wordmark";
import {
	Sidebar,
	SidebarContent,
	SidebarGroup,
	SidebarHeader,
} from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";

export function AppSidebar() {
	return (
		<Sidebar
			className={cn(
				"*:data-[slot=sidebar-inner]:bg-background",
				"*:data-[slot=sidebar-inner]:dark:bg-[radial-gradient(60%_18%_at_10%_0%,theme(--color-foreground/.08),transparent)]",
				"**:data-[slot=sidebar-menu-button]:[&>span]:text-foreground/75",
			)}
			collapsible="offcanvas"
			variant="sidebar"
		>
			<SidebarHeader className="h-14 justify-center border-b px-3">
				<a
					className="-mx-1 inline-flex w-fit items-center rounded-md px-1.5 py-1 transition-colors hover:bg-sidebar-accent"
					href="#/"
				>
					<Wordmark className="gap-2.5 text-xl" />
				</a>
			</SidebarHeader>
			<SidebarContent>
				<SidebarGroup>
					<SidebarSearch />
				</SidebarGroup>
				<ConversationList />
			</SidebarContent>
		</Sidebar>
	);
}
