import type { UIMessage } from "ai";
import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  mockFindConversation,
  mockGenerateConversationTitle,
  mockUpdateWhere,
  mockWarn,
} = vi.hoisted(() => ({
  mockFindConversation: vi.fn(),
  mockGenerateConversationTitle: vi.fn(),
  mockUpdateWhere: vi.fn(),
  mockWarn: vi.fn(),
}));

vi.mock("@animus/agent", () => ({
  generateConversationTitle: mockGenerateConversationTitle,
}));

vi.mock("@animus/db", () => ({
  conversation: { id: "conversation.id" },
  db: {
    query: {
      conversation: {
        findFirst: mockFindConversation,
      },
    },
    update: () => ({
      set: vi.fn(() => ({ where: mockUpdateWhere })),
    }),
  },
  eq: vi.fn((left, right) => ({ eq: [left, right] })),
}));

vi.mock("../lib/logger.ts", () => ({
  logger: { warn: mockWarn },
}));

const { maybeGenerateConversationTitle } = await import(
  "../services/conversation-titles.ts"
);

const userMessage = {
  id: "msg-user",
  role: "user",
  parts: [{ type: "text", text: "Explain eigenvectors" }],
} satisfies UIMessage;
const assistantMessage = {
  id: "msg-assistant",
  role: "assistant",
  parts: [{ type: "text", text: "Eigenvectors keep direction." }],
} satisfies UIMessage;

beforeEach(() => {
  vi.clearAllMocks();
  mockFindConversation.mockResolvedValue({
    id: "conversation-1",
    titleStatus: "pending",
  });
  mockGenerateConversationTitle.mockResolvedValue("Eigenvector Direction");
  mockUpdateWhere.mockResolvedValue(undefined);
});

describe("conversation title service", () => {
  it("does nothing until there is a user and assistant message", async () => {
    maybeGenerateConversationTitle({
      conversationId: "conversation-1",
      messages: [userMessage],
    });
    await Promise.resolve();

    expect(mockGenerateConversationTitle).not.toHaveBeenCalled();
  });

  it("generates a title for pending conversations", async () => {
    maybeGenerateConversationTitle({
      conversationId: "conversation-1",
      messages: [userMessage, assistantMessage],
    });
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(mockGenerateConversationTitle).toHaveBeenCalledWith(
      expect.objectContaining({
        firstPrompt: "Explain eigenvectors",
        assistantSummary: "Eigenvectors keep direction.",
        telemetry: expect.objectContaining({
          functionId: "conversation-title",
          metadata: { conversationId: "conversation-1" },
        }),
      })
    );
    expect(mockUpdateWhere).toHaveBeenCalledTimes(1);
  });

  it("does not overwrite non-pending titles", async () => {
    mockFindConversation.mockResolvedValue({
      id: "conversation-1",
      titleStatus: "manual",
    });

    maybeGenerateConversationTitle({
      conversationId: "conversation-1",
      messages: [userMessage, assistantMessage],
    });
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(mockGenerateConversationTitle).not.toHaveBeenCalled();
  });

  it("logs title generation failures", async () => {
    mockGenerateConversationTitle.mockRejectedValue(new Error("model failed"));

    maybeGenerateConversationTitle({
      conversationId: "conversation-1",
      messages: [userMessage, assistantMessage],
    });
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(mockWarn).toHaveBeenCalledWith(
      expect.objectContaining({ conversationId: "conversation-1" }),
      "failed to generate title"
    );
  });
});
