import type { ConversationSummary } from "@animus/core";
import { MoreHorizontalIcon, PencilIcon, Trash2Icon } from "lucide-react";
import { useState } from "react";
import { useNavigate, useParams } from "react-router";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { SidebarMenuAction } from "@/components/ui/sidebar";
import {
	deleteConversation,
	notifyConversationsChanged,
	renameConversation,
} from "@/lib/conversations";

function RenameDialog({
	conversation,
	open,
	onOpenChange,
}: {
	conversation: ConversationSummary;
	open: boolean;
	onOpenChange: (open: boolean) => void;
}) {
	const [title, setTitle] = useState(conversation.title);
	const [saving, setSaving] = useState(false);
	const [error, setError] = useState(false);

	const save = () => {
		if (!title.trim()) {
			return;
		}
		setSaving(true);
		setError(false);
		void renameConversation(conversation.id, { title })
			.then(() => {
				notifyConversationsChanged();
				onOpenChange(false);
			})
			.catch(() => setError(true))
			.finally(() => setSaving(false));
	};

	return (
		<Dialog onOpenChange={onOpenChange} open={open}>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>Rename conversation</DialogTitle>
					<DialogDescription>
						Update the title shown in your sidebar and breadcrumbs.
					</DialogDescription>
				</DialogHeader>
				<Input
					autoFocus
					onChange={(event) => setTitle(event.target.value)}
					onKeyDown={(event) => {
						if (event.key === "Enter") {
							save();
						}
					}}
					value={title}
				/>
				{error ? (
					<p className="text-destructive text-sm">
						Could not rename. Try again.
					</p>
				) : null}
				<DialogFooter>
					<Button
						disabled={saving}
						onClick={() => onOpenChange(false)}
						variant="outline"
					>
						Cancel
					</Button>
					<Button disabled={!title.trim() || saving} onClick={save}>
						Save
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}

function DeleteDialog({
	conversation,
	open,
	onOpenChange,
}: {
	conversation: ConversationSummary;
	open: boolean;
	onOpenChange: (open: boolean) => void;
}) {
	const { chatId } = useParams<{ chatId?: string }>();
	const navigate = useNavigate();
	const [saving, setSaving] = useState(false);
	const [error, setError] = useState(false);

	const confirm = () => {
		setSaving(true);
		setError(false);
		void deleteConversation(conversation.id)
			.then(() => {
				if (chatId === conversation.id) {
					navigate("/studio");
				}
				notifyConversationsChanged();
				onOpenChange(false);
			})
			.catch(() => setError(true))
			.finally(() => setSaving(false));
	};

	return (
		<Dialog onOpenChange={onOpenChange} open={open}>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>Delete conversation</DialogTitle>
					<DialogDescription>
						This removes the conversation and its messages.
					</DialogDescription>
				</DialogHeader>
				{error ? (
					<p className="text-destructive text-sm">
						Could not delete. Try again.
					</p>
				) : null}
				<DialogFooter>
					<Button
						disabled={saving}
						onClick={() => onOpenChange(false)}
						variant="outline"
					>
						Cancel
					</Button>
					<Button disabled={saving} onClick={confirm} variant="destructive">
						Delete
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}

export function ConversationRowActions({
	conversation,
}: {
	conversation: ConversationSummary;
}) {
	const [dialog, setDialog] = useState<"rename" | "delete" | null>(null);

	return (
		<>
			<DropdownMenu>
				<DropdownMenuTrigger asChild>
					<SidebarMenuAction showOnHover>
						<MoreHorizontalIcon />
						<span className="sr-only">Conversation actions</span>
					</SidebarMenuAction>
				</DropdownMenuTrigger>
				<DropdownMenuContent align="end" className="w-36">
					<DropdownMenuItem onClick={() => setDialog("rename")}>
						<PencilIcon />
						Rename
					</DropdownMenuItem>
					<DropdownMenuSeparator />
					<DropdownMenuItem
						onClick={() => setDialog("delete")}
						variant="destructive"
					>
						<Trash2Icon />
						Delete
					</DropdownMenuItem>
				</DropdownMenuContent>
			</DropdownMenu>

			{/* Keyed so the dialog's internal state resets per open. */}
			{dialog === "rename" ? (
				<RenameDialog
					conversation={conversation}
					key={`rename-${conversation.title}`}
					onOpenChange={(open) => setDialog(open ? "rename" : null)}
					open
				/>
			) : null}
			{dialog === "delete" ? (
				<DeleteDialog
					conversation={conversation}
					onOpenChange={(open) => setDialog(open ? "delete" : null)}
					open
				/>
			) : null}
		</>
	);
}
