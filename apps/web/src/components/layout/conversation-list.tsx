import { Link, useParams } from "react-router";
import { ConversationRowActions } from "@/components/layout/conversation-row-actions";
import {
	SidebarGroup,
	SidebarGroupLabel,
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem,
	SidebarMenuSkeleton,
} from "@/components/ui/sidebar";
import { useConversationList } from "@/hooks/use-conversation-list";

const SKELETON_KEYS = ["one", "two", "three", "four", "five", "six"] as const;

function SkeletonRows({ count }: { count: number }) {
	return (
		<SidebarGroup>
			<SidebarMenu>
				{SKELETON_KEYS.slice(0, count).map((key) => (
					<SidebarMenuItem key={key}>
						<SidebarMenuSkeleton />
					</SidebarMenuItem>
				))}
			</SidebarMenu>
		</SidebarGroup>
	);
}

export function ConversationList({ search }: { search: string }) {
	const { chatId } = useParams<{ chatId?: string }>();
	const { groups, query, loading, loadingMore, error, hasMore, loadMoreRef } =
		useConversationList(search);

	// Skeletons only when there's nothing to show yet (first load). Background
	// refreshes and search re-queries update in place so the list never flashes.
	if (loading && groups.length === 0) {
		return <SkeletonRows count={SKELETON_KEYS.length} />;
	}

	if (error) {
		return (
			<div className="px-3 py-5 text-destructive text-sm">
				Could not load conversations.
			</div>
		);
	}

	if (groups.length === 0) {
		return (
			<div className="px-3 py-5 text-muted-foreground text-sm">
				{query.trim() ? "No matching conversations." : "No conversations yet."}
			</div>
		);
	}

	return (
		<>
			{groups.map((group) => (
				<SidebarGroup key={group.label}>
					<SidebarGroupLabel>{group.label}</SidebarGroupLabel>
					<SidebarMenu>
						{group.items.map((item) => (
							<SidebarMenuItem key={item.id}>
								<SidebarMenuButton asChild isActive={item.id === chatId}>
									<Link to={`/studio/c/${item.id}`}>
										<span className="truncate">{item.title}</span>
									</Link>
								</SidebarMenuButton>
								<ConversationRowActions conversation={item} />
							</SidebarMenuItem>
						))}
					</SidebarMenu>
				</SidebarGroup>
			))}
			<div ref={loadMoreRef}>
				{loadingMore ? <SkeletonRows count={1} /> : null}
			</div>
			{hasMore ? null : (
				<div className="px-3 py-4 text-center text-muted-foreground/80 text-xs">
					{query.trim()
						? "End of matching conversations."
						: "No more conversations."}
				</div>
			)}
		</>
	);
}
