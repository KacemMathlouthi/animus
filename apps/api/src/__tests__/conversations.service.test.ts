import type { UIMessage } from "ai";
import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  mockFindMany,
  mockFindFirst,
  mockInsertValues,
  mockTransaction,
  mockTxDeleteWhere,
  mockTxInsertValues,
  mockTxUpdateWhere,
  mockUpdateReturning,
  mockDeleteReturning,
} = vi.hoisted(() => ({
  mockFindMany: vi.fn(),
  mockFindFirst: vi.fn(),
  mockInsertValues: vi.fn(),
  mockTransaction: vi.fn(),
  mockTxDeleteWhere: vi.fn(),
  mockTxInsertValues: vi.fn(),
  mockTxUpdateWhere: vi.fn(),
  mockUpdateReturning: vi.fn(),
  mockDeleteReturning: vi.fn(),
}));

vi.mock("@animus/db", () => ({
  and: vi.fn((...args) => ({ and: args })),
  asc: vi.fn((value) => ({ asc: value })),
  conversation: {
    id: "conversation.id",
    userId: "conversation.user_id",
    title: "conversation.title",
    updatedAt: "conversation.updated_at",
  },
  conversationMessage: {
    conversationId: "conversation_message.conversation_id",
    position: "conversation_message.position",
    textContent: "conversation_message.text_content",
  },
  db: {
    query: {
      conversation: {
        findMany: mockFindMany,
        findFirst: mockFindFirst,
      },
    },
    insert: () => ({ values: mockInsertValues }),
    transaction: mockTransaction,
    update: () => ({
      set: () => ({ where: () => ({ returning: mockUpdateReturning }) }),
    }),
    delete: () => ({ where: () => ({ returning: mockDeleteReturning }) }),
  },
  desc: vi.fn((value) => ({ desc: value })),
  eq: vi.fn((left, right) => ({ eq: [left, right] })),
  ilike: vi.fn((left, right) => ({ ilike: [left, right] })),
  or: vi.fn((...args) => ({ or: args })),
  querySql: vi.fn(() => ({ sql: true })),
}));

const {
  createConversation,
  deleteConversation,
  isUIMessage,
  listConversations,
  loadOwnedConversation,
  mergeIncomingMessage,
  renameConversation,
  saveConversationMessages,
  serializeConversation,
  textOf,
} = await import("../services/conversations.ts");

const NOW = new Date("2026-06-21T12:00:00.000Z");
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

function row(overrides: Record<string, unknown> = {}) {
  return {
    id: "conversation-1",
    userId: "user-1",
    title: "Explaining Eigenvectors",
    titleStatus: "generated",
    createdAt: NOW,
    updatedAt: NOW,
    lastMessageAt: NOW,
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  mockInsertValues.mockResolvedValue(undefined);
  mockTransaction.mockImplementation(async (callback) => {
    const tx = {
      delete: () => ({ where: mockTxDeleteWhere }),
      insert: () => ({ values: mockTxInsertValues }),
      update: () => ({
        set: () => ({ where: mockTxUpdateWhere }),
      }),
    };
    await callback(tx);
  });
});

describe("conversation service helpers", () => {
  it("serializes database rows for the API", () => {
    expect(serializeConversation(row())).toEqual({
      id: "conversation-1",
      title: "Explaining Eigenvectors",
      titleStatus: "generated",
      createdAt: NOW.toISOString(),
      updatedAt: NOW.toISOString(),
      lastMessageAt: NOW.toISOString(),
    });
  });

  it("extracts searchable text from text parts only", () => {
    expect(
      textOf({
        id: "msg",
        role: "assistant",
        parts: [
          { type: "text", text: "Hello " },
          { type: "reasoning", text: "hidden" },
          { type: "text", text: "world" },
        ],
      } as UIMessage)
    ).toBe("Hello world");
  });

  it("validates and merges UI messages", () => {
    expect(isUIMessage(userMessage)).toBe(true);
    expect(isUIMessage({ id: "msg" })).toBe(false);
    expect(mergeIncomingMessage([userMessage], assistantMessage)).toEqual([
      userMessage,
      assistantMessage,
    ]);

    const updated = { ...userMessage, parts: [{ type: "text", text: "New" }] };
    expect(mergeIncomingMessage([userMessage], updated as UIMessage)).toEqual([
      updated,
    ]);
  });
});

describe("conversation service", () => {
  it("creates pending conversations", async () => {
    const created = await createConversation("user-1");

    expect(created).toMatchObject({
      title: "Untitled video",
      titleStatus: "pending",
      lastMessageAt: null,
    });
    expect(mockInsertValues).toHaveBeenCalledWith(
      expect.objectContaining({ userId: "user-1", titleStatus: "pending" })
    );
  });

  it("lists conversations with optional search", async () => {
    mockFindMany.mockResolvedValue([row()]);

    await expect(
      listConversations({ userId: "user-1", query: " eigen " })
    ).resolves.toEqual([serializeConversation(row())]);

    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({ limit: 100 })
    );
  });

  it("loads owned conversations with ordered UI messages", async () => {
    mockFindFirst.mockResolvedValue({
      ...row(),
      messages: [{ uiMessage: userMessage }, { uiMessage: assistantMessage }],
    });

    await expect(
      loadOwnedConversation({
        conversationId: "conversation-1",
        userId: "user-1",
      })
    ).resolves.toEqual({
      conversation: expect.objectContaining({ id: "conversation-1" }),
      messages: [userMessage, assistantMessage],
    });
  });

  it("returns null when an owned conversation is missing", async () => {
    mockFindFirst.mockResolvedValue(null);

    await expect(
      loadOwnedConversation({
        conversationId: "missing",
        userId: "user-1",
      })
    ).resolves.toBeNull();
  });

  it("saves a full message snapshot transactionally", async () => {
    await saveConversationMessages({
      conversationId: "conversation-1",
      messages: [userMessage, assistantMessage],
    });

    expect(mockTxDeleteWhere).toHaveBeenCalledTimes(1);
    expect(mockTxInsertValues).toHaveBeenCalledWith([
      expect.objectContaining({
        conversationId: "conversation-1",
        messageId: "msg-user",
        position: 0,
        role: "user",
        textContent: "Explain eigenvectors",
      }),
      expect.objectContaining({
        messageId: "msg-assistant",
        position: 1,
        textContent: "Eigenvectors keep direction.",
      }),
    ]);
    expect(mockTxUpdateWhere).toHaveBeenCalledTimes(1);
  });

  it("renames conversations and marks title as manual", async () => {
    mockUpdateReturning.mockResolvedValue([
      row({ title: "New title", titleStatus: "manual" }),
    ]);

    await expect(
      renameConversation({
        conversationId: "conversation-1",
        userId: "user-1",
        title: "New title",
      })
    ).resolves.toMatchObject({ title: "New title", titleStatus: "manual" });
  });

  it("returns null when rename finds no row", async () => {
    mockUpdateReturning.mockResolvedValue([]);

    await expect(
      renameConversation({
        conversationId: "missing",
        userId: "user-1",
        title: "New title",
      })
    ).resolves.toBeNull();
  });

  it("returns whether delete removed a row", async () => {
    mockDeleteReturning.mockResolvedValueOnce([{ id: "conversation-1" }]);
    await expect(
      deleteConversation({ conversationId: "conversation-1", userId: "user-1" })
    ).resolves.toBe(true);

    mockDeleteReturning.mockResolvedValueOnce([]);
    await expect(
      deleteConversation({ conversationId: "missing", userId: "user-1" })
    ).resolves.toBe(false);
  });
});
