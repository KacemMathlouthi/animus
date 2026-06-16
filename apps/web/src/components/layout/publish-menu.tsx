import {
	ChevronDownIcon,
	Code2Icon,
	DownloadIcon,
	LinkIcon,
	Share2Icon,
	UploadIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuGroup,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function PublishMenu() {
	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<Button size="sm" variant="outline">
					<UploadIcon data-icon="inline-start" />
					Publish
					<ChevronDownIcon
						className="text-muted-foreground"
						data-icon="inline-end"
					/>
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent align="end" className="w-56">
				<DropdownMenuGroup>
					<DropdownMenuItem>
						<DownloadIcon />
						Download video
					</DropdownMenuItem>
					<DropdownMenuItem>
						<LinkIcon />
						Copy share link
					</DropdownMenuItem>
					<DropdownMenuItem>
						<Share2Icon />
						Share…
					</DropdownMenuItem>
				</DropdownMenuGroup>
				<DropdownMenuSeparator />
				<DropdownMenuItem>
					<Code2Icon />
					Embed
				</DropdownMenuItem>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
