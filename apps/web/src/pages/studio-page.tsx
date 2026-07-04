import { LayoutGroup } from "motion/react";
import { useCallback, useEffect, useState } from "react";
import { useLocation, useParams } from "react-router";
import type { AppBreadcrumbSegment } from "@/components/layout/app-breadcrumbs";
import { AppShell } from "@/components/layout/app-shell";
import { useRegisterPublishTarget } from "@/components/layout/publish-target";
import { StudioEmptyState } from "@/features/studio/components/studio-empty-state";
import { StudioLoading } from "@/features/studio/components/studio-loading";
import { StudioStage } from "@/features/studio/components/studio-view";
import { useConversationDetail } from "@/features/studio/hooks/use-conversation-detail";
import { useStartConversation } from "@/features/studio/hooks/use-start-conversation";
import { useStudioChat } from "@/features/studio/hooks/use-studio-chat";
import type { AnimusUIMessage } from "@/features/studio/types";
import { useDocumentTitle } from "@/hooks/use-document-title";
import {
	type ConversationDetail,
	notifyConversationsChanged,
} from "@/lib/conversations";
import { takePendingPrompt } from "@/lib/pending-prompt";

function NewStudio() {
	const { start, creating, error } = useStartConversation();

	// A signed-out visitor who typed a prompt on the landing page was routed
	// through auth; replay it now that they've landed. takePendingPrompt is
	// read-once, which also guards against a double-invoked effect (strict mode).
	useEffect(() => {
		const pending = takePendingPrompt();
		if (pending) {
			start(pending);
		}
	}, [start]);

	return (
		<>
			<StudioEmptyState
				onSubmit={start}
				status={creating ? "submitted" : "ready"}
			/>
			{error ? (
				<p className="-mt-8 text-center text-destructive text-sm">{error}</p>
			) : null}
		</>
	);
}

function LoadedStudioChat({
	chatId,
	detail,
}: {
	chatId: string;
	detail: ConversationDetail;
}) {
	const location = useLocation();
	const prompt = (location.state as { prompt?: string } | null)?.prompt;
	const { messages, status, phase, videoKey, respondToTool, send, stop } =
		useStudioChat({
			chatId,
			initialPrompt: prompt,
			initialMessages: detail.messages as AnimusUIMessage[],
			// A finished turn persists new messages and may generate a title; let
			// the sidebar and detail hook refresh from that single signal.
			onConversationUpdated: notifyConversationsChanged,
		});

	// Expose the latest render to the header's Publish menu (disabled until one exists).
	useRegisterPublishTarget(
		videoKey ? { videoKey, title: detail.conversation.title } : null,
	);

	return (
		<StudioStage
			messages={messages}
			onStop={stop}
			onSubmit={send}
			phase={phase}
			respondToTool={respondToTool}
			seed={chatId}
			status={status}
			title={detail.conversation.title}
			videoKey={videoKey}
		/>
	);
}

function StudioChat({
	chatId,
	onTitleChange,
}: {
	chatId: string;
	onTitleChange: (title: string) => void;
}) {
	const { detail, error } = useConversationDetail(chatId);

	// Report the breadcrumb title for every state. On mount (and whenever the
	// keyed chatId changes) detail is null, so this resets to a neutral title
	// before the conversation loads.
	useEffect(() => {
		if (error) {
			onTitleChange("Conversation not found");
		} else {
			onTitleChange(detail?.conversation.title ?? "New video");
		}
	}, [detail, error, onTitleChange]);

	if (error) {
		return (
			<div className="flex flex-1 items-center justify-center px-4 text-center text-muted-foreground text-sm">
				Conversation not found.
			</div>
		);
	}

	if (!detail) {
		return <StudioLoading />;
	}

	return <LoadedStudioChat chatId={chatId} detail={detail} />;
}

export function StudioPage() {
	const { chatId } = useParams<{ chatId?: string }>();
	const [title, setTitle] = useState("New video");
	const onTitleChange = useCallback((next: string) => setTitle(next), []);

	// On the new-video screen there's no conversation to title; StudioChat owns
	// the title for every loaded/loading/error state once a chatId is present.
	const pageTitle = chatId ? title : "New video";
	useDocumentTitle(pageTitle);

	const breadcrumbs: AppBreadcrumbSegment[] = [{ title: pageTitle }];

	return (
		<AppShell breadcrumbs={breadcrumbs}>
			<LayoutGroup>
				{chatId ? (
					<StudioChat
						chatId={chatId}
						key={chatId}
						onTitleChange={onTitleChange}
					/>
				) : (
					<NewStudio />
				)}
			</LayoutGroup>
		</AppShell>
	);
}
