import {
	ChevronDownIcon,
	DownloadIcon,
	Share2Icon,
	UploadIcon,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { usePublishTarget } from "@/components/layout/publish-target";
import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ShareDialog } from "@/features/studio/components/share-dialog";
import { downloadVideo } from "@/lib/share";

/** Header action to publish the current video. Disabled until a render is ready
 * (no publish target), so it's inert on the new-video screen and other pages. */
export function PublishMenu() {
	const target = usePublishTarget();
	const [shareOpen, setShareOpen] = useState(false);

	return (
		<>
			<DropdownMenu>
				<DropdownMenuTrigger asChild>
					<Button disabled={!target} size="sm" variant="outline">
						<UploadIcon data-icon="inline-start" />
						Publish
						<ChevronDownIcon
							className="text-muted-foreground"
							data-icon="inline-end"
						/>
					</Button>
				</DropdownMenuTrigger>
				<DropdownMenuContent align="end" className="w-56">
					<DropdownMenuItem
						onSelect={() => {
							if (target) {
								downloadVideo(target.videoKey, target.title).catch(() =>
									toast.error("Couldn't download the video. Try again."),
								);
							}
						}}
					>
						<DownloadIcon />
						Download video
					</DropdownMenuItem>
					<DropdownMenuItem onSelect={() => setShareOpen(true)}>
						<Share2Icon />
						Share…
					</DropdownMenuItem>
				</DropdownMenuContent>
			</DropdownMenu>

			{target ? (
				<ShareDialog
					onOpenChange={setShareOpen}
					open={shareOpen}
					title={target.title}
					videoKey={target.videoKey}
				/>
			) : null}
		</>
	);
}
