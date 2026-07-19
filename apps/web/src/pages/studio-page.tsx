import { LayoutGroup } from "motion/react";
import { type ReactNode, useEffect } from "react";
import { useLocation, useParams } from "react-router";
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
	const {
		messages,
		status,
		phase,
		videoKey,
		respondToTool,
		send,
		stop,
		error: turnError,
		retry,
	} = useStudioChat({
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
			error={turnError}
			messages={messages}
			onRetry={retry}
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

// Loads a conversation and derives its title for the document + breadcrumb
// directly from the loaded detail — no effect syncing state up to the page.
function StudioConversation({ chatId }: { chatId: string }) {
	const { detail, error } = useConversationDetail(chatId);
	const title = error
		? "Conversation not found"
		: (detail?.conversation.title ?? "New video");
	useDocumentTitle(title);

	let content: ReactNode;
	if (error) {
		content = (
			<div className="flex flex-1 items-center justify-center px-4 text-center text-muted-foreground text-sm">
				Conversation not found.
			</div>
		);
	} else if (detail) {
		content = <LoadedStudioChat chatId={chatId} detail={detail} />;
	} else {
		content = <StudioLoading />;
	}

	return (
		<AppShell breadcrumbs={[{ title }]}>
			<LayoutGroup>{content}</LayoutGroup>
		</AppShell>
	);
}

function NewStudioShell() {
	useDocumentTitle("New video");
	return (
		<AppShell breadcrumbs={[{ title: "New video" }]}>
			<LayoutGroup>
				<NewStudio />
			</LayoutGroup>
		</AppShell>
	);
}

export function StudioPage() {
	const { chatId } = useParams<{ chatId?: string }>();
	return chatId ? (
		<StudioConversation chatId={chatId} key={chatId} />
	) : (
		<NewStudioShell />
	);
}
