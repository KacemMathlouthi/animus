import { generateConversationTitle } from "@animus/agent";
import { conversation, db, eq } from "@animus/db";
import type { UIMessage } from "ai";
import { logger } from "../lib/logger.ts";
import { textOf } from "./conversations.ts";

export function maybeGenerateConversationTitle({
  conversationId,
  messages,
}: {
  conversationId: string;
  messages: UIMessage[];
}) {
  const firstPrompt = messages.find((message) => message.role === "user");
  const firstAssistant = messages.find(
    (message) => message.role === "assistant"
  );
  if (!(firstPrompt && firstAssistant)) {
    return;
  }

  const generateTitle = async () => {
    const current = await db.query.conversation.findFirst({
      where: eq(conversation.id, conversationId),
    });
    if (current?.titleStatus !== "pending") {
      return;
    }

    const title = await generateConversationTitle({
      firstPrompt: textOf(firstPrompt),
      assistantSummary: textOf(firstAssistant),
    });

    await db
      .update(conversation)
      .set({ title, titleStatus: "generated", updatedAt: new Date() })
      .where(eq(conversation.id, conversationId));
  };

  generateTitle().catch((error) => {
    logger.warn({ err: error, conversationId }, "failed to generate title");
  });
}
