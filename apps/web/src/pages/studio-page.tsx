import { LayoutGroup } from "motion/react";
import { useLocation, useNavigate, useParams } from "react-router";
import type { AppBreadcrumbSegment } from "@/components/layout/app-breadcrumbs";
import { AppShell } from "@/components/layout/app-shell";
import { findConversation } from "@/entities/conversation";
import { StudioEmptyState } from "@/features/studio/components/studio-empty-state";
import { StudioStage } from "@/features/studio/components/studio-view";
import { useStudioChat } from "@/features/studio/hooks/use-studio-chat";

function NewStudio() {
	const navigate = useNavigate();
	return (
		<StudioEmptyState
			onSubmit={(text) =>
				navigate(`/studio/c/${crypto.randomUUID()}`, {
					state: { prompt: text },
				})
			}
		/>
	);
}

function StudioChat({ chatId }: { chatId: string }) {
	const location = useLocation();
	const prompt = (location.state as { prompt?: string } | null)?.prompt;
	const { messages, status, phase, videoUrl, respondToTool, send, stop } =
		useStudioChat({
			chatId,
			initialPrompt: prompt,
		});

	return (
		<StudioStage
			messages={messages}
			onStop={stop}
			onSubmit={send}
			phase={phase}
			respondToTool={respondToTool}
			status={status}
			videoUrl={videoUrl}
		/>
	);
}

export function StudioPage() {
	const { chatId } = useParams<{ chatId?: string }>();
	const conversation = chatId ? findConversation(chatId) : undefined;
	const breadcrumbs: AppBreadcrumbSegment[] = [
		{ title: conversation?.title ?? "New video" },
	];

	return (
		<AppShell breadcrumbs={breadcrumbs}>
			<LayoutGroup>
				{chatId ? <StudioChat chatId={chatId} key={chatId} /> : <NewStudio />}
			</LayoutGroup>
		</AppShell>
	);
}
