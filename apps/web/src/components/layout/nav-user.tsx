import { LogOutIcon, SettingsIcon, UserIcon } from "lucide-react";
import { useNavigate } from "react-router";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuGroup,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { UserAvatar } from "@/components/user-avatar";
import { signOut, useSession } from "@/lib/auth-client";
import { displayNameFrom } from "@/lib/user";

export function NavUser() {
	const { data } = useSession();
	const navigate = useNavigate();
	const user = data?.user;

	if (!user) {
		return null;
	}

	const displayName = displayNameFrom(user.name, user.email);

	async function handleLogout() {
		await signOut();
		navigate("/");
	}

	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<button
					aria-label="Account menu"
					className="rounded-full"
					type="button"
				>
					<UserAvatar
						className="size-8"
						email={user.email}
						image={user.image}
						name={user.name}
					/>
				</button>
			</DropdownMenuTrigger>
			<DropdownMenuContent align="end" className="w-64">
				<DropdownMenuLabel className="flex items-center gap-3 py-2">
					<UserAvatar
						className="size-10 shrink-0"
						email={user.email}
						image={user.image}
						name={user.name}
					/>
					<div className="min-w-0">
						<p className="truncate font-medium text-foreground text-sm">
							{displayName}
						</p>
						<p className="break-all text-muted-foreground text-xs">
							{user.email}
						</p>
					</div>
				</DropdownMenuLabel>
				<DropdownMenuSeparator />
				<DropdownMenuGroup>
					<DropdownMenuItem
						className="cursor-pointer"
						onSelect={() => navigate("/settings/account")}
					>
						<UserIcon />
						Account
					</DropdownMenuItem>
					<DropdownMenuItem
						className="cursor-pointer"
						onSelect={() => navigate("/settings/generation")}
					>
						<SettingsIcon />
						Settings
					</DropdownMenuItem>
				</DropdownMenuGroup>
				<DropdownMenuSeparator />
				<DropdownMenuGroup>
					<DropdownMenuItem
						className="w-full cursor-pointer"
						onSelect={() => {
							void handleLogout();
						}}
						variant="destructive"
					>
						<LogOutIcon />
						Log out
					</DropdownMenuItem>
				</DropdownMenuGroup>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
