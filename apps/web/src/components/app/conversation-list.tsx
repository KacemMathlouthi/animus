import { Link, useParams } from "react-router";
import { conversationGroups } from "@/components/app/app-shared";
import {
	SidebarGroup,
	SidebarGroupLabel,
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem,
} from "@/components/ui/sidebar";

export function ConversationList() {
	const { chatId } = useParams<{ chatId?: string }>();

	return (
		<>
			{conversationGroups.map((group) => (
				<SidebarGroup key={group.label}>
					<SidebarGroupLabel>{group.label}</SidebarGroupLabel>
					<SidebarMenu>
						{group.items.map((item) => (
							<SidebarMenuItem key={item.id}>
								<SidebarMenuButton asChild isActive={chatId === item.id}>
									<Link to={`/studio/c/${item.id}`}>
										<span className="truncate">{item.title}</span>
									</Link>
								</SidebarMenuButton>
							</SidebarMenuItem>
						))}
					</SidebarMenu>
				</SidebarGroup>
			))}
		</>
	);
}
