import { LogOutIcon, SettingsIcon, UserIcon } from "lucide-react";
import { currentUser as user } from "@/components/app/app-shared";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuGroup,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function NavUser() {
	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<Avatar className="size-8">
					<AvatarImage src={user.avatar} />
					<AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
				</Avatar>
			</DropdownMenuTrigger>
			<DropdownMenuContent align="end" className="w-60">
				<DropdownMenuItem className="flex items-center justify-start gap-2">
					<DropdownMenuLabel className="flex items-center gap-3">
						<Avatar className="size-10">
							<AvatarImage src={user.avatar} />
							<AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
						</Avatar>
						<div>
							<span className="font-medium text-foreground">{user.name}</span>{" "}
							<br />
							<div className="max-w-full overflow-hidden overflow-ellipsis whitespace-nowrap text-muted-foreground text-xs">
								{user.email}
							</div>
						</div>
					</DropdownMenuLabel>
				</DropdownMenuItem>
				<DropdownMenuSeparator />
				<DropdownMenuGroup>
					<DropdownMenuItem>
						<UserIcon />
						Account
					</DropdownMenuItem>
					<DropdownMenuItem>
						<SettingsIcon />
						Settings
					</DropdownMenuItem>
				</DropdownMenuGroup>
				<DropdownMenuSeparator />
				<DropdownMenuGroup>
					<DropdownMenuItem
						className="w-full cursor-pointer"
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
